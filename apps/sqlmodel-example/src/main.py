"""
FastAPI Application for SQLAlchemy OLTP to OLAP CDC Pipeline

This API provides CRUD operations for an e-commerce system.
All database changes are captured by PostgreSQL CDC and streamed to ClickHouse.
"""

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional
from datetime import datetime
import logging
import os
from .db.models import Customer, CustomerInsert 
from .db.models import Product, ProductInsert
from .db.models import Order, OrderInsert
from .db.models import OrderItem, OrderItemInsert
from .db.base import get_db, check_db_connection, init_db

# ==================== API Response Models ====================

T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    """Standardized API response wrapper to match Express backend"""
    success: bool
    data: Optional[T] = None
    message: Optional[str] = None
    error: Optional[str] = None

def create_success_response(data: T, message: Optional[str] = None) -> ApiResponse[T]:
    """Create a successful API response"""
    return ApiResponse(success=True, data=data, message=message)

def create_error_response(error: str, message: Optional[str] = None) -> ApiResponse[None]:
    """Create an error API response"""
    return ApiResponse(success=False, error=error, message=message)


# ==================== Custom Response Models ====================

class OrderWithItems(BaseModel):
    """Order response model that explicitly includes items"""
    id: Optional[int] = None
    customerId: int
    orderDate: Optional[datetime] = None
    total: float
    status: str
    items: list[OrderItem] = []


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SQLAlchemy OLTP API",
    description="E-commerce API with CDC to ClickHouse OLAP",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Exception Handlers ====================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed logging"""
    errors = exc.errors()
    logger.error(f"Validation error on {request.method} {request.url.path}")
    logger.error(f"Request body: {await request.body()}")
    logger.error(f"Validation errors: {errors}")
    
    error_response = create_error_response(
        error="Validation Error",
        message="Request data failed validation. Check 'details' for specific field errors."
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            **error_response.model_dump(),
            "details": errors
        },
    )


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    """Handle database integrity errors (unique constraints, foreign keys, etc.)"""
    logger.error(f"Database integrity error on {request.method} {request.url.path}: {str(exc)}")
    
    error_response = create_error_response(
        error="Database Integrity Error",
        message="The operation violates database constraints (e.g., duplicate key, foreign key violation)"
    )
    
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            **error_response.model_dump(),
            "details": str(exc.orig) if hasattr(exc, 'orig') else str(exc)
        },
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle general SQLAlchemy errors"""
    logger.error(f"Database error on {request.method} {request.url.path}: {str(exc)}")
    
    error_response = create_error_response(
        error="Database Error",
        message="An error occurred while processing your request"
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            **error_response.model_dump(),
            "details": str(exc)
        },
    )


# ==================== Middleware ====================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    logger.info(f"➡️  {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        logger.info(f"⬅️  {request.method} {request.url.path} - Status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"❌ {request.method} {request.url.path} - Error: {str(e)}")
        raise


# ==================== Health Check ====================

@app.get("/health", response_model=ApiResponse[dict])
def health_check():
    health_data = {
        "status": "ok",
        "service": "SQLAlchemy OLTP API",
        "version": "1.0.0",
    }
    return create_success_response(health_data, "Service is healthy")


# ==================== Customer Endpoints ====================

@app.get("/api/customers", response_model=ApiResponse[list[Customer]])
def get_customers(db: Session = Depends(get_db)):
    """
    Retrieve all customers from the database.
    
    Returns:
        ApiResponse[list[Customer]]: Wrapped response with list of all customers
        
    Raises:
        HTTPException: If database error occurs
    """
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting to fetch all customers")
        
        with db:
            customers = db.exec(select(Customer)).all()
            
            logger.info(f"Successfully retrieved {len(customers)} customers")
            return create_success_response(customers, f"Retrieved {len(customers)} customers")
            
    except SQLAlchemyError as e:
        logger.error(f"Database error on GET /api/customers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Database Error",
                "message": "Failed to retrieve customers",
                "details": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error on GET /api/customers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Internal Server Error", 
                "message": "An unexpected error occurred while retrieving customers",
                "details": str(e)
            }
        )


@app.get("/api/customers/{customerId}", response_model=ApiResponse[Customer])
def get_customer(customerId: int, db: Session = Depends(get_db)):
    with db:
        customer = db.exec(select(Customer).where(Customer.id == customerId)).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return create_success_response(customer, f"Customer {customerId} retrieved successfully")


@app.post("/api/customers", status_code=status.HTTP_201_CREATED, response_model=ApiResponse[Customer])
def create_customer(customer: CustomerInsert, db: Session = Depends(get_db)):
    logger.info(f"Creating customer: email={customer.email}, name={customer.name}")
    db_customer = Customer(**customer.model_dump())
    with db:
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)
        return create_success_response(db_customer, f"Customer {db_customer.name} created successfully")


@app.put("/api/customers/{customerId}", response_model=ApiResponse[Customer])
def update_customer(
    customerId: int,
    customer: CustomerInsert,
    db: Session = Depends(get_db)
):
    logger.info(f"Updating customer: id={customerId}")
    
    with db:
        db_customer = db.get(Customer, customerId)
        if not db_customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        customer_data = customer.model_dump()
        db_customer.sqlmodel_update(customer_data)
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)
        logger.info(f"✅ Customer updated successfully: id={customerId}")
        return create_success_response(db_customer, f"Customer {customerId} updated successfully")


@app.delete("/api/customers/{customerId}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customerId: int, db: Session = Depends(get_db)):
    logger.info(f"Deleting customer: id={customerId}")
    
    with db:
        db_customer = db.exec(select(Customer).where(Customer.id == customerId)).first()
        if not db_customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        db.delete(db_customer)
        db.commit()
        logger.info(f"✅ Customer deleted successfully: id={customerId}")
        return None


# ==================== Product Endpoints ====================

@app.get("/api/products", response_model=ApiResponse[list[Product]])
def get_products(db: Session = Depends(get_db)):
    with db:
        products = db.exec(select(Product)).all()
        return create_success_response(products, f"Retrieved {len(products)} products")


@app.get("/api/products/{productId}", response_model=ApiResponse[Product])
def get_product(productId: int, db: Session = Depends(get_db)):
    with db:
        product = db.get(Product, productId)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return create_success_response(product, f"Product {productId} retrieved successfully")


@app.post("/api/products", status_code=status.HTTP_201_CREATED, response_model=ApiResponse[Product])
def create_product(product: ProductInsert, db: Session = Depends(get_db)):
    db_product = Product(**product.model_dump())
    with db:
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return create_success_response(db_product, f"Product {db_product.name} created successfully")


@app.put("/api/products/{productId}", response_model=ApiResponse[Product])
def update_product(productId: int, product: ProductInsert, db: Session = Depends(get_db)):
    with db:
        db_product = db.get(Product, productId)
        if not db_product:
            raise HTTPException(status_code=404, detail="Product not found")
        db_product.sqlmodel_update(product)
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return create_success_response(db_product, f"Product {productId} updated successfully")


# ==================== Order Endpoints ====================

@app.get("/api/orders", response_model=ApiResponse[list[OrderWithItems]])
def get_orders(db: Session = Depends(get_db)):
    with db:
        orders = db.exec(select(Order)).all()
        
        # Convert orders to OrderWithItems and load items
        orders_with_items = []
        for order in orders:
            order_with_items = OrderWithItems(
                id=order.id,
                customerId=order.customerId,
                orderDate=order.orderDate,
                total=order.total,
                status=order.status,
                items=order.items
            )
            orders_with_items.append(order_with_items)
        
        return create_success_response(orders_with_items, f"Retrieved {len(orders)} orders")


@app.get("/api/orders/{orderId}", response_model=ApiResponse[OrderWithItems])
def get_order(orderId: int, db: Session = Depends(get_db)):
    with db:
        order = db.get(Order, orderId)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Load items and convert to OrderWithItems
        order_items = list(db.exec(select(OrderItem).where(OrderItem.orderId == order.id)).all())
        
        order_with_items = OrderWithItems(
            id=order.id,
            customerId=order.customerId,
            orderDate=order.orderDate,
            total=order.total,
            status=order.status,
            items=order_items
        )
        
        return create_success_response(order_with_items, f"Order {orderId} retrieved successfully")


@app.post("/api/orders", status_code=status.HTTP_201_CREATED, response_model=ApiResponse[Order])
def create_order(order: OrderInsert, db: Session = Depends(get_db)):
    try:
        customer = db.get(Customer, order.customerId)
        if not customer:
            raise HTTPException(
                status_code=400, 
                detail={
                    "success": False,
                    "error": "Customer not found",
                    "message": f"Customer with id {order.customerId} does not exist"
                }
            )
        
        order_data = order.model_dump()
        db_order = Order(**order_data)
        
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        
        order_id = db_order.id
        
        # Load the items for the newly created order to ensure they're included in JSON response
        db_order.items = list(db.exec(select(OrderItem).where(OrderItem.orderId == order_id)).all())
        
        return create_success_response(db_order, f"Order {order_id} created successfully for {customer.name}")
    
    except HTTPException as he:
        raise
        
    except IntegrityError as ie:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "success": False,
                "error": "Database Integrity Error",
                "message": "Order creation failed due to database constraints",
                "details": str(ie.orig) if hasattr(ie, 'orig') else str(ie),
            }
        )
        
    except SQLAlchemyError as sae:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "Database Error",
                "message": "Order creation failed due to database error",
                "details": str(sae),
            }
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": "Internal Server Error",
                "message": "Order creation failed due to unexpected error",
                "details": str(e),
            }
        )


@app.put("/api/orders/{orderId}", response_model=ApiResponse[Order])
def update_order(
    orderId: int,
    order: OrderInsert,
    db: Session = Depends(get_db)
):
    with db:
        db_order = db.get(Order, orderId)
        if not db_order:
            raise HTTPException(status_code=404, detail="Order not found")
        db_order.sqlmodel_update(order)
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        return create_success_response(db_order, f"Order {orderId} updated successfully")
    

@app.delete("/api/orders/{orderId}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(orderId: int, db: Session = Depends(get_db)):
    with db:
        db_order = db.get(Order, orderId)
        if not db_order:
            raise HTTPException(status_code=404, detail="Order not found")
        db.delete(db_order)
        db.commit()
        return None


# ==================== OrderItem Endpoints ====================

@app.get("/api/order-items", response_model=ApiResponse[list[OrderItem]])
def get_order_items(db: Session = Depends(get_db)):
    with db:
        order_items = db.exec(select(OrderItem)).all()
        return create_success_response(order_items, f"Retrieved {len(order_items)} order items")


@app.get("/api/order-items/{itemId}", response_model=ApiResponse[OrderItem])
def get_order_item(itemId: int, db: Session = Depends(get_db)):
    with db:
        item = db.get(OrderItem, itemId)
        if not item:
            raise HTTPException(status_code=404, detail="Order item not found")
        return create_success_response(item, f"Order item {itemId} retrieved successfully")


@app.post("/api/order-items", status_code=status.HTTP_201_CREATED, response_model=ApiResponse[OrderItem])
def create_order_item(item: OrderItemInsert, db: Session = Depends(get_db)):
    logger.info(
        f"Creating order item: orderId={item.orderId}, "
        f"productId={item.productId}, quantity={item.quantity}"
    )
    
    try:
        # Verify order and product exist
        order = db.get(Order, item.orderId)
        if not order:
            logger.warning(f"Order item creation failed: Order {item.orderId} not found")
            raise HTTPException(status_code=400, detail=f"Order with id {item.orderId} not found")

        product = db.get(Product, item.productId)
        if not product:
            logger.warning(f"Order item creation failed: Product {item.productId} not found")
            raise HTTPException(status_code=400, detail=f"Product with id {item.productId} not found")

        db_item = OrderItem(**item.model_dump())
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        
        logger.info(f"✅ Order item created successfully: id={db_item.id}")
        return create_success_response(db_item, f"Order item {db_item.id} created successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating order item: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to create order item: {str(e)}"
        )


@app.put("/api/order-items/{itemId}", response_model=ApiResponse[OrderItem])
def update_order_item(
    itemId: int,
    item: OrderItemInsert,
    db: Session = Depends(get_db)
):
    with db:
        db_item = db.get(OrderItem, itemId)
        if not db_item:
            raise HTTPException(status_code=404, detail="Order item not found")
        db_item.sqlmodel_update(item)
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return create_success_response(db_item, f"Order item {itemId} updated successfully")


@app.delete("/api/order-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order_item(itemId: int, db: Session = Depends(get_db)):
    with db:
        db_item = db.get(OrderItem, itemId)
        if not db_item:
            raise HTTPException(status_code=404, detail="Order item not found")
        db.delete(db_item)
        db.commit()
        return None


# ==================== Startup/Shutdown ====================

@app.on_event("startup")
async def startup_event():
    """Check database connection on startup"""
    logger.info("🚀 Starting up...")
    
    # Check database connection
    if check_db_connection():
        logger.info("✅ Database connection verified")
    else:
        logger.error("❌ Database connection failed - check your connection settings")
        raise RuntimeError("Database connection failed")
    
    # Only initialize tables in development or if AUTO_INIT_DB is set
    auto_init = os.getenv("AUTO_INIT_DB", "false").lower() == "true"
    if auto_init:
        logger.info("🔧 Auto-initializing database tables (AUTO_INIT_DB=true)...")
        init_db()
        logger.info("✅ Database tables initialized")
    else:
        logger.info("ℹ️  Skipping table initialization (set AUTO_INIT_DB=true to enable)")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("👋 Shutting down...")
