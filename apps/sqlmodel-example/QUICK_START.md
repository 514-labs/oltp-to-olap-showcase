# SQLAlchemy Example - Quick Start

## Prerequisites

- Python 3.10+
- PostgreSQL running (default: `localhost:5434`)

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Database

**Option 1: Environment variables**

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5434/sqlalchemy_db"
```

**Option 2: Create .env file (recommended)**

```bash
cp env.example .env
# Edit .env with your settings
```

### 3. Initialize Database

**First time setup:**

```bash
python init_db.py
```

**Reset database (drops all data!):**

```bash
python init_db.py --drop
```

### 4. Run the API Server

**Development (without auto-init):**

```bash
fastapi dev src/main.py --port 3002
```

**Development (with auto-init):**

```bash
AUTO_INIT_DB=true fastapi dev src/main.py --port 3002
```

**Production:**

```bash
fastapi run src/main.py --port 3002
```

## Usage

### Health Check

```bash
curl http://localhost:3002/health
```

### Create Customer

```bash
curl -X POST http://localhost:3002/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "country": "USA",
    "city": "New York"
  }'
```

### Create Product

```bash
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "category": "Electronics",
    "price": "999.99"
  }'
```

### Create Order

```bash
curl -X POST http://localhost:3002/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "total": "999.99",
    "status": "pending"
  }'
```

### API Documentation

Open your browser:

- **Swagger UI**: http://localhost:3002/docs
- **ReDoc**: http://localhost:3002/redoc

## Environment Variables

| Variable       | Default                                                       | Description                              |
| -------------- | ------------------------------------------------------------- | ---------------------------------------- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5434/sqlalchemy_db` | PostgreSQL connection string             |
| `AUTO_INIT_DB` | `false`                                                       | Auto-create tables on startup (dev only) |

## Database Management

See [docs/DATABASE_MANAGEMENT.md](docs/DATABASE_MANAGEMENT.md) for detailed information about:

- Why auto-initialization was changed
- When to use manual vs automatic initialization
- Migration strategies for production
- Troubleshooting

## Project Structure

```
sqlalchemy-example/
├── src/
│   ├── models/          # SQLAlchemy ORM models
│   │   ├── base.py      # Database configuration
│   │   ├── customer.py  # Customer model
│   │   ├── product.py   # Product model
│   │   ├── order.py     # Order model
│   │   └── order_item.py # OrderItem model
│   ├── schemas.py       # Pydantic validation schemas
│   └── main.py          # FastAPI application
├── init_db.py           # Database initialization script
├── requirements.txt     # Python dependencies
└── docs/
    ├── DATABASE_MANAGEMENT.md
    └── ...
```

## Features

✅ **Type-Safe**: Full type hints with Pydantic validation  
✅ **Modern SQLAlchemy**: Using SQLAlchemy 2.0 declarative style  
✅ **Error Handling**: Comprehensive error logging and responses  
✅ **Validation**: Field-level validation with clear error messages  
✅ **Auto-Documentation**: OpenAPI/Swagger docs auto-generated  
✅ **CDC Ready**: Compatible with PostgreSQL CDC to ClickHouse

## Next Steps

1. **Add more endpoints** - Expand the API as needed
2. **Setup CDC pipeline** - Configure PostgreSQL → Kafka → ClickHouse
3. **Add Alembic** - For production-grade database migrations
4. **Add tests** - Write unit and integration tests
5. **Deploy** - Containerize and deploy to production

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
psql $DATABASE_URL -c "SELECT 1"

# Check connection string
echo $DATABASE_URL
```

### Tables Not Created

```bash
# Run manual initialization
python init_db.py

# Or enable auto-init
AUTO_INIT_DB=true uvicorn src.main:app --reload --port 3002
```

### Validation Errors (422)

Check the error response for detailed field-level errors:

```json
{
  "success": false,
  "error": "Validation Error",
  "details": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

## Frontend Compatibility

The API uses camelCase field names for compatibility with the test client:

```bash
# Test camelCase compatibility
python test_camelcase.py
```

This allows the same frontend to work with both TypeORM and SQLAlchemy backends. See [CAMELCASE_API.md](CAMELCASE_API.md) for details.

## Learn More

- [Type Alignment Guide](TYPE_ALIGNMENT.md) - TypeScript ↔ FastAPI type mappings
- [CamelCase API Guide](CAMELCASE_API.md) - Frontend compatibility strategy
- [FastAPI CLI Guide](docs/FASTAPI_CLI_GUIDE.md) - Using the FastAPI dev server
- [Database Management Guide](docs/DATABASE_MANAGEMENT.md) - Database initialization strategies
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/en/20/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
