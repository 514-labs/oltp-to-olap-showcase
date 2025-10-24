# Migration to FastAPI CLI

## Summary

Your FastAPI application has been refactored to use the **FastAPI CLI** instead of direct Uvicorn calls. This provides a simpler, more modern development experience.

---

## What Changed

### ✅ **1. Removed Uvicorn Boilerplate**

**Before:**

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)
```

**After:**

```python
# No boilerplate needed!
# Just define your FastAPI app and routes
```

### ✅ **2. Updated Dependencies**

**Before:**

```txt
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
```

**After:**

```txt
fastapi[standard]>=0.115.0  # Includes uvicorn and FastAPI CLI
python-dotenv>=1.0.0        # For .env file support
```

### ✅ **3. Simplified Commands**

**Before:**

```bash
uvicorn src.main:app --reload --port 3002
```

**After:**

```bash
fastapi dev src/main.py --port 3002
```

### ✅ **4. Added .env File Support**

**New files:**

- `env.example` - Template for environment variables
- `.env` - Your local configuration (git-ignored)

**Auto-loading:**

```python
from dotenv import load_dotenv
load_dotenv()  # Automatically loads .env
```

### ✅ **5. Updated Documentation**

- `QUICK_START.md` - Updated all commands
- `docs/DATABASE_MANAGEMENT.md` - Updated all commands
- `docs/FASTAPI_CLI_GUIDE.md` - New comprehensive guide

---

## New Workflow

### First Time Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp env.example .env
# Edit .env with your settings

# 3. Initialize database
python init_db.py

# 4. Run development server
fastapi dev src/main.py --port 3002
```

### Daily Development

```bash
# Start dev server (with auto-reload)
fastapi dev src/main.py --port 3002

# With auto-init enabled
AUTO_INIT_DB=true fastapi dev src/main.py --port 3002
```

### Production

```bash
# Run production server
fastapi run src/main.py --port 3002 --workers 4
```

---

## Command Comparison

| Task              | Old Command                                       | New Command                                |
| ----------------- | ------------------------------------------------- | ------------------------------------------ |
| **Development**   | `uvicorn src.main:app --reload --port 3002`       | `fastapi dev src/main.py --port 3002`      |
| **Production**    | `uvicorn src.main:app --host 0.0.0.0 --port 3002` | `fastapi run src/main.py --port 3002`      |
| **With env vars** | `DATABASE_URL=... uvicorn src.main:app --reload`  | `DATABASE_URL=... fastapi dev src/main.py` |
| **Help**          | `uvicorn --help`                                  | `fastapi dev --help`                       |

---

## Benefits

### 🚀 **Simpler**

- No module path syntax (`src.main:app` → `src/main.py`)
- No need for `if __name__ == "__main__"` block
- Cleaner, more intuitive commands

### 🔧 **Better Defaults**

- Development mode has auto-reload by default
- Production mode is optimized automatically
- Proper host/port configuration

### 📦 **Batteries Included**

- Single install: `fastapi[standard]`
- Includes uvicorn, websockets, httptools, etc.
- Official FastAPI tooling

### 🎨 **Better DX**

- Colorful, formatted logs
- Clear error messages
- Better development experience

---

## Environment Variables

### Using .env File (Recommended)

```bash
# 1. Create .env from template
cp env.example .env

# 2. Edit .env
DATABASE_URL=postgresql://user:pass@localhost:5434/mydb
AUTO_INIT_DB=true

# 3. Run (automatically loads .env)
fastapi dev src/main.py --port 3002
```

### Using Shell Exports

```bash
export DATABASE_URL="postgresql://..."
export AUTO_INIT_DB=true
fastapi dev src/main.py --port 3002
```

### One-off Override

```bash
AUTO_INIT_DB=true fastapi dev src/main.py --port 3002
```

---

## Docker Integration

### Development

```dockerfile
FROM python:3.11

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Use FastAPI CLI for development
CMD ["fastapi", "dev", "src/main.py", "--host", "0.0.0.0", "--port", "3002"]
```

### Production

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use FastAPI CLI for production
CMD ["fastapi", "run", "src/main.py", "--host", "0.0.0.0", "--port", "3002", "--workers", "4"]
```

---

## Troubleshooting

### Command not found

```bash
# Reinstall with standard extras
pip install "fastapi[standard]>=0.115.0"
```

### .env not loading

Make sure:

1. File is named `.env` (not `env` or `.env.local`)
2. File is in the project root
3. Format is correct: `KEY=value` (no spaces around `=`)

### Old commands still work

If you prefer, you can still use uvicorn directly:

```bash
uvicorn src.main:app --reload --port 3002
```

But the FastAPI CLI is recommended for better experience.

---

## Next Steps

1. ✅ Run `pip install -r requirements.txt` to get new dependencies
2. ✅ Create your `.env` file from `env.example`
3. ✅ Initialize the database: `python init_db.py`
4. ✅ Start the server: `fastapi dev src/main.py --port 3002`
5. ✅ Visit http://localhost:3002/docs

---

## Learn More

- [FastAPI CLI Documentation](https://fastapi.tiangolo.com/fastapi-cli/)
- [FastAPI CLI Guide](docs/FASTAPI_CLI_GUIDE.md)
- [Database Management Guide](docs/DATABASE_MANAGEMENT.md)

---

**All commands in documentation have been updated to use FastAPI CLI!** 🎉
