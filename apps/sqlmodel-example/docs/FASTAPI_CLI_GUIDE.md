# FastAPI CLI Guide

This project uses the **FastAPI CLI** for running the development and production servers.

## Why FastAPI CLI?

The FastAPI CLI (available in `fastapi[standard]`) provides:

✅ **Simpler commands** - No need to remember `uvicorn` module paths  
✅ **Built-in defaults** - Auto-reload, proper host/port settings  
✅ **Better DX** - Clear development vs production modes  
✅ **Batteries included** - Comes with all necessary tools

## Commands

### Development Server

```bash
fastapi dev src/main.py
```

**Features:**

- Auto-reload on code changes
- Runs on `http://127.0.0.1:8000` by default
- Detailed error pages
- Hot reload

**Custom port:**

```bash
fastapi dev src/main.py --port 3002
```

**Custom host:**

```bash
fastapi dev src/main.py --host 0.0.0.0 --port 3002
```

### Production Server

```bash
fastapi run src/main.py
```

**Features:**

- Optimized for performance
- No auto-reload
- Production-ready defaults
- Runs on `http://0.0.0.0:8000` by default

**Custom settings:**

```bash
fastapi run src/main.py --port 3002 --workers 4
```

## With Environment Variables

```bash
# Development with auto-init
AUTO_INIT_DB=true fastapi dev src/main.py --port 3002

# Production
DATABASE_URL="postgresql://..." fastapi run src/main.py
```

## Using .env File

The FastAPI CLI automatically loads `.env` files!

**Create .env:**

```bash
cp env.example .env
```

**Edit .env:**

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/sqlalchemy_db
AUTO_INIT_DB=false
```

**Run:**

```bash
fastapi dev src/main.py --port 3002
```

No need for `python-dotenv` in your code - FastAPI CLI handles it!

## Command Comparison

| Old (Uvicorn)                                   | New (FastAPI CLI)                     | Notes               |
| ----------------------------------------------- | ------------------------------------- | ------------------- |
| `uvicorn src.main:app --reload`                 | `fastapi dev src/main.py`             | Simpler path syntax |
| `uvicorn src.main:app --reload --port 3002`     | `fastapi dev src/main.py --port 3002` | Same functionality  |
| `uvicorn src.main:app --host 0.0.0.0 --port 80` | `fastapi run src/main.py --port 80`   | Production mode     |
| `python -m uvicorn src.main:app`                | `fastapi dev src/main.py`             | No need for `-m`    |

## Benefits Over Direct Uvicorn

### Before (Uvicorn)

```python
# Had to add this in main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)
```

### After (FastAPI CLI)

```python
# No boilerplate needed!
# Just define your app
app = FastAPI()
```

## Tips

### 1. Check Available Options

```bash
fastapi dev --help
fastapi run --help
```

### 2. API Documentation

Once running, visit:

- **Swagger UI**: http://localhost:3002/docs
- **ReDoc**: http://localhost:3002/redoc

### 3. View Logs

FastAPI CLI shows colorful, formatted logs by default.

### 4. Stop Server

Press `Ctrl+C` to stop the server gracefully.

## Docker Usage

In your Dockerfile:

```dockerfile
# Development
CMD ["fastapi", "dev", "src/main.py", "--host", "0.0.0.0", "--port", "3002"]

# Production
CMD ["fastapi", "run", "src/main.py", "--host", "0.0.0.0", "--port", "3002"]
```

## CI/CD Usage

```yaml
# GitHub Actions example
- name: Run API tests
  run: |
    fastapi dev src/main.py --port 3002 &
    sleep 5
    curl http://localhost:3002/health
```

## Troubleshooting

### "fastapi: command not found"

```bash
# Make sure fastapi[standard] is installed
pip install "fastapi[standard]>=0.115.0"

# Or reinstall requirements
pip install -r requirements.txt
```

### Port already in use

```bash
# Use a different port
fastapi dev src/main.py --port 3003

# Or kill the process using the port
lsof -ti:3002 | xargs kill -9
```

### .env not loading

The FastAPI CLI automatically loads `.env` files. Make sure:

1. File is named `.env` (not `env` or `.env.local`)
2. File is in the same directory where you run the command
3. Variables are in the format: `KEY=value`

## Learn More

- [FastAPI CLI Documentation](https://fastapi.tiangolo.com/fastapi-cli/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)

---

**Quick Start:**

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
fastapi dev src/main.py --port 3002
```

That's it! 🚀
