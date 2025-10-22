"""
FastAPI Application for SQLAlchemy OLTP to OLAP CDC Pipeline

This API provides CRUD operations for an e-commerce system.
All database changes are captured by PostgreSQL CDC and streamed to ClickHouse.
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from . import schemas
from .models import base, Customer, Product, Order, OrderItem

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


# ==================== Health Check ====================

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "SQLAlchemy OLTP API",
        "version": "1.0.0",
    }


# ==================== Customer Endpoints ====================

@app.get("/api/customers", response_model=schemas.ApiResponse)
def get_customers(db: Session = Depends(base.get_db)):
    customers = db.query(Customer).all()
    return {"success": True, "data": [schemas.Customer.model_validate(c).model_dump() for c in customers]}


@app.get("/api/customers/{customer_id}", response_model=schemas.ApiResponse)
def get_customer(customer_id: int, db: Session = Depends(base.get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"success": True, "data": schemas.Customer.model_validate(customer).model_dump()}


@app.post("/api/customers", status_code=status.HTTP_201_CREATED, response_model=schemas.ApiResponse)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(base.get_db)):
    db_customer = Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return {"success": True, "data": schemas.Customer.model_validate(db_customer).model_dump()}


@app.put("/api/customers/{customer_id}", response_model=schemas.ApiResponse)
def update_customer(
    customer_id: int,
    customer: schemas.CustomerUpdate,
    db: Session = Depends(base.get_db)
):
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    for key, value in customer.model_dump().items():
        setattr(db_customer, key, value)

    db.commit()
    db.refresh(db_customer)
    return {"success": True, "data": schemas.Customer.model_validate(db_customer).model_dump()}


@app.delete("/api/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(base.get_db)):
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    db.delete(db_customer)
    db.commit()


# ==================== Product Endpoints ====================

@app.get("/api/products", response_model=schemas.ApiResponse)
def get_products(db: Session = Depends(base.get_db)):
    products = db.query(Product).all()
    return {"success": True, "data": [schemas.Product.model_validate(p).model_dump() for p in products]}


@app.get("/api/products/{product_id}", response_model=schemas.ApiResponse)
def get_product(product_id: int, db: Session = Depends(base.get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "data": schemas.Product.model_validate(product).model_dump()}


@app.post("/api/products", status_code=status.HTTP_201_CREATED, response_model=schemas.ApiResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(base.get_db)):
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return {"success": True, "data": schemas.Product.model_validate(db_product).model_dump()}


@app.put("/api/products/{product_id}", response_model=schemas.ApiResponse)
def update_product(
    product_id: int,
    product: schemas.ProductUpdate,
    db: Session = Depends(base.get_db)
):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, value in product.model_dump().items():
        setattr(db_product, key, value)

    db.commit()
    db.refresh(db_product)
    return {"success": True, "data": schemas.Product.model_validate(db_product).model_dump()}


@app.delete("/api/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(base.get_db)):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(db_product)
    db.commit()


# ==================== Order Endpoints ====================

@app.get("/api/orders", response_model=schemas.ApiResponse)
def get_orders(db: Session = Depends(base.get_db)):
    orders = db.query(Order).all()
    return {"success": True, "data": [schemas.Order.model_validate(o).model_dump() for o in orders]}


@app.get("/api/orders/{order_id}", response_model=schemas.ApiResponse)
def get_order(order_id: int, db: Session = Depends(base.get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"success": True, "data": schemas.Order.model_validate(order).model_dump()}


@app.post("/api/orders", status_code=status.HTTP_201_CREATED, response_model=schemas.ApiResponse)
def create_order(order: schemas.OrderCreate, db: Session = Depends(base.get_db)):
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found")

    db_order = Order(**order.model_dump())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return {"success": True, "data": schemas.Order.model_validate(db_order).model_dump()}


@app.put("/api/orders/{order_id}", response_model=schemas.ApiResponse)
def update_order(
    order_id: int,
    order: schemas.OrderUpdate,
    db: Session = Depends(base.get_db)
):
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    for key, value in order.model_dump().items():
        setattr(db_order, key, value)

    db.commit()
    db.refresh(db_order)
    return {"success": True, "data": schemas.Order.model_validate(db_order).model_dump()}


@app.delete("/api/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(base.get_db)):
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    db.delete(db_order)
    db.commit()


# ==================== OrderItem Endpoints ====================

@app.get("/api/order-items", response_model=schemas.ApiResponse)
def get_order_items(db: Session = Depends(base.get_db)):
    items = db.query(OrderItem).all()
    return {"success": True, "data": [schemas.OrderItem.model_validate(i).model_dump() for i in items]}


@app.get("/api/order-items/{item_id}", response_model=schemas.ApiResponse)
def get_order_item(item_id: int, db: Session = Depends(base.get_db)):
    item = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    return {"success": True, "data": schemas.OrderItem.model_validate(item).model_dump()}


@app.post("/api/order-items", status_code=status.HTTP_201_CREATED, response_model=schemas.ApiResponse)
def create_order_item(item: schemas.OrderItemCreate, db: Session = Depends(base.get_db)):
    # Verify order and product exist
    order = db.query(Order).filter(Order.id == item.order_id).first()
    if not order:
        raise HTTPException(status_code=400, detail="Order not found")

    product = db.query(Product).filter(Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")

    db_item = OrderItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"success": True, "data": schemas.OrderItem.model_validate(db_item).model_dump()}


@app.put("/api/order-items/{item_id}", response_model=schemas.ApiResponse)
def update_order_item(
    item_id: int,
    item: schemas.OrderItemUpdate,
    db: Session = Depends(base.get_db)
):
    db_item = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Order item not found")

    for key, value in item.model_dump().items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)
    return {"success": True, "data": schemas.OrderItem.model_validate(db_item).model_dump()}


@app.delete("/api/order-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order_item(item_id: int, db: Session = Depends(base.get_db)):
    db_item = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Order item not found")

    db.delete(db_item)
    db.commit()


# ==================== Startup/Shutdown ====================

@app.on_event("startup")
def startup_event():
    """Initialize database on startup"""
    print("🚀 Initializing database tables...")
    base.init_db()
    print("✅ Database initialized")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)
