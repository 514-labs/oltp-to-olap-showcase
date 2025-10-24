# Manual vs Auto-Generated Schemas Comparison

This document compares the current manual Pydantic schema approach with auto-generated schemas.

## 📊 Current Approach (Manual)

**File: `src/schemas.py`** (117 lines)

```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from decimal import Decimal

# ==================== Customer Schemas ====================

class CustomerBase(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=255)
    country: str = Field(min_length=1, max_length=100)
    city: str = Field(min_length=1, max_length=100)

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ... repeat for Product, Order, OrderItem (4 models × ~25 lines each)
```

**Pros:**
- ✅ Explicit and clear
- ✅ Full control over validation rules
- ✅ Good for documentation/learning
- ✅ No magic - easy to debug

**Cons:**
- ❌ 117 lines of boilerplate
- ❌ Duplication with SQLAlchemy models
- ❌ Must manually sync when models change
- ❌ More code to maintain

---

## 🤖 Auto-Generated Approach

**File: `src/schemas_auto.py`** (37 lines + utility)

```python
from src.utils.schema_generator import generate_schemas
from src.models.customer import Customer as CustomerModel
from src.models.product import Product as ProductModel
from src.models.order import Order as OrderModel
from src.models.order_item import OrderItem as OrderItemModel

# ==================== Auto-Generated Schemas ====================

# Customer schemas - ONE line generates CREATE and READ!
CustomerCreate, CustomerRead = generate_schemas(CustomerModel)

# Product schemas
ProductCreate, ProductRead = generate_schemas(ProductModel)

# Order schemas
OrderCreate, OrderRead = generate_schemas(OrderModel)

# OrderItem schemas
OrderItemCreate, OrderItemRead = generate_schemas(OrderItemModel)
```

**Pros:**
- ✅ DRY (Don't Repeat Yourself)
- ✅ Auto-syncs with model changes
- ✅ 80% less code (8 lines vs ~100 lines)
- ✅ Fewer bugs from manual sync issues

**Cons:**
- ❌ Less explicit
- ❌ Slightly harder to customize (though still possible)
- ❌ Magic can be confusing for beginners

---

## 📈 Code Reduction

### Manual Approach

| File | Lines | Purpose |
|------|-------|---------|
| `src/models/customer.py` | 33 | SQLAlchemy model |
| `src/schemas.py` (Customer section) | ~30 | Pydantic schemas |
| **Total per model** | **~63** | **2 files to maintain** |

### Auto-Generated Approach

| File | Lines | Purpose |
|------|-------|---------|
| `src/models/customer.py` | 33 | SQLAlchemy model |
| `src/schemas_auto.py` (Customer section) | 2 | Auto-generated schemas |
| `src/utils/schema_generator.py` | 100 | Reusable utility (one-time) |
| **Total per model** | **~35** | **44% less code** |

**For 4 models:**
- Manual: ~250 lines
- Auto-generated: ~108 lines (138 lines saved!)

---

## 🔄 Sync Example

**Scenario:** Add a `phone` field to Customer

### Manual Approach (Must update 2 places)

```python
# 1. Update SQLAlchemy model
class Customer(Base):
    __tablename__ = "customers"
    # ... existing fields
    phone = Column(String(20), nullable=True)  # ← Add here

# 2. Update Pydantic schema (easy to forget!)
class CustomerBase(BaseModel):
    email: EmailStr
    name: str
    # ... existing fields
    phone: str | None = None  # ← Must remember to add here too!
```

**If you forget step 2:**
- ❌ API won't accept `phone` in requests
- ❌ API won't return `phone` in responses
- ❌ OpenAPI docs won't show `phone` field

### Auto-Generated Approach (Update 1 place)

```python
# 1. Update SQLAlchemy model - that's it!
class Customer(Base):
    __tablename__ = "customers"
    # ... existing fields
    phone = Column(String(20), nullable=True)  # ← Add here

# Schemas automatically updated! ✨
```

**Auto-magic:**
- ✅ API automatically accepts `phone`
- ✅ API automatically returns `phone`
- ✅ OpenAPI docs automatically updated

---

## 🎨 Customization Example

Both approaches support customization:

### Manual

```python
class CustomerCreate(CustomerBase):
    email: EmailStr  # ✅ Custom email validation
    password: str = Field(min_length=8)  # ✅ Custom validation

class CustomerRead(CustomerBase):
    id: int
    # ❌ password excluded manually
```

### Auto-Generated

```python
# Basic generation
CustomerCreate, CustomerRead = generate_schemas(CustomerModel)

# Custom exclusions/inclusions
CustomerLogin = sqlalchemy_to_pydantic(
    CustomerModel,
    name="CustomerLogin",
    include={"email", "password"},  # Only these fields
)

# Custom validation
from pydantic import Field, field_validator

class CustomerCreateWithValidation(CustomerCreate):
    @field_validator('email')
    def validate_email_domain(cls, v):
        if not v.endswith('@company.com'):
            raise ValueError('must be company email')
        return v
```

---

## 🚀 Usage in FastAPI

**Both approaches work identically:**

```python
# Works with BOTH manual and auto-generated schemas
from src.schemas import CustomerCreate, CustomerRead  # Manual
# OR
from src.schemas_auto import CustomerCreate, CustomerRead  # Auto

@app.post("/api/customers", response_model=CustomerRead)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    db_customer = CustomerModel(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer  # Automatically converted to CustomerRead
```

---

## 💡 Recommendation

### Use Manual Schemas When:
- 🎓 **Learning/teaching** - explicit is better for understanding
- 📝 **Complex validation** - many custom business rules
- 🎯 **API-first design** - API contract differs significantly from DB schema
- 👥 **Small team** - few models, easy to keep in sync

### Use Auto-Generated Schemas When:
- 🏢 **Large codebase** - many models (10+)
- 🔄 **Frequent changes** - rapidly evolving schema
- 👨‍💼 **Database-first design** - API closely mirrors DB schema
- ⚡ **Fast development** - prototyping, MVPs

### Hybrid Approach (Best of Both Worlds):
```python
# Auto-generate base schemas
CustomerCreate, CustomerRead = generate_schemas(CustomerModel)

# Manually override for special cases
class CustomerLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

class CustomerPublic(CustomerRead):
    # Exclude sensitive fields from read schema
    model_config = ConfigDict(exclude={'email'})
```

---

## 📦 How to Use Auto-Generation in This Project

### Step 1: The utility is already created

The `src/utils/schema_generator.py` utility is ready to use!

### Step 2: Import and use

```python
# Option A: Use the convenience function
from src.utils.schema_generator import generate_schemas
from src.models.customer import Customer

CustomerCreate, CustomerRead = generate_schemas(Customer)

# Option B: Use the lower-level function for more control
from src.utils.schema_generator import sqlalchemy_to_pydantic

CustomerCreate = sqlalchemy_to_pydantic(
    Customer,
    name="CustomerCreate",
    exclude={"id", "created_at", "orders"}
)
```

### Step 3: Use in FastAPI

```python
from src.schemas_auto import CustomerCreate, CustomerRead

@app.post("/api/customers", response_model=CustomerRead)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    # ... same as before
```

---

## 🎯 Conclusion

**For this project:**
- Current approach (manual) is kept for **educational clarity**
- Auto-generated approach is available in `src/schemas_auto.py` for **production use**
- Both work with the same FastAPI endpoints
- You can switch between them without changing endpoint code!

**Try both and see which you prefer!**

```bash
# Test the auto-generated schemas
cd apps/sqlalchemy-example
python -m src.schemas_auto
```
