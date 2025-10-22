# Using UV with SQLAlchemy Example

**UV** is an extremely fast Python package installer and resolver, written in Rust by Astral (creators of Ruff).

## Why UV?

| Feature | pip | UV |
|---------|-----|-----|
| **Speed** | ~10-30 seconds | **<1 second** |
| **Dependency resolution** | Slow | Lightning fast |
| **Virtual environments** | `python -m venv` | `uv venv` (faster) |
| **Cache** | Basic | Advanced |
| **Written in** | Python | Rust |

## Installation

### macOS/Linux

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Windows

```powershell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Using pip (if you prefer)

```bash
pip install uv
```

## Quick Start

### 1. Create Virtual Environment

```bash
cd apps/sqlalchemy-example

# Create .venv/ directory with Python 3.10+
uv venv

# Activate it
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows
```

**What happened:**
- UV automatically downloaded Python 3.10.16 (if needed)
- Created `.venv/` directory in <1 second
- Ready to install packages

### 2. Install Dependencies

```bash
# Install all dependencies from pyproject.toml
uv pip install -e .
```

**Speed comparison:**
- pip: ~10-30 seconds
- UV: **<1 second** ⚡

### 3. Run the Application

```bash
# Make sure you're in the virtual environment
source .venv/bin/activate  # If not already activated

# Start the API
python -m uvicorn src.main:app --reload --port 3002
```

## Common UV Commands

### Install Packages

```bash
# Install from pyproject.toml
uv pip install -e .

# Install specific package
uv pip install requests

# Install with extras
uv pip install -e ".[dev]"
```

### Manage Virtual Environments

```bash
# Create new venv
uv venv

# Create with specific Python version
uv venv --python 3.10

# Create with different name
uv venv my-venv
```

### List Packages

```bash
# List installed packages
uv pip list

# Show package details
uv pip show fastapi
```

### Update Packages

```bash
# Update all packages
uv pip install -U -e .

# Update specific package
uv pip install -U fastapi
```

### Remove Packages

```bash
# Uninstall a package
uv pip uninstall requests
```

## UV vs pip Cheat Sheet

| Task | pip | UV |
|------|-----|-----|
| Create venv | `python -m venv venv` | `uv venv` |
| Install deps | `pip install -e .` | `uv pip install -e .` |
| Install package | `pip install requests` | `uv pip install requests` |
| List packages | `pip list` | `uv pip list` |
| Update package | `pip install -U requests` | `uv pip install -U requests` |

**Note:** UV uses `uv pip` subcommand to maintain compatibility with pip.

## Project Structure with UV

```
sqlalchemy-example/
├── .venv/                 # Created by 'uv venv' (gitignored)
├── pyproject.toml         # Dependencies (read by UV)
├── src/
│   ├── models/
│   ├── schemas.py
│   └── main.py
└── README.md
```

## Troubleshooting

### UV not found

```bash
# Check if UV is installed
which uv

# If not found, install it
curl -LsSf https://astral.sh/uv/install.sh | sh

# Add to PATH (may be needed)
export PATH="$HOME/.cargo/bin:$PATH"
```

### Python version mismatch

```bash
# UV will automatically download the right Python version
uv venv --python 3.10

# Or specify exact version
uv venv --python 3.10.16
```

### Permission errors

```bash
# On macOS/Linux, you may need to make the script executable
chmod +x ~/.local/bin/uv
```

### Virtual environment not activating

```bash
# Make sure you're using the right command
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows

# If using fish shell
source .venv/bin/activate.fish
```

## Integration with IDEs

### VS Code

1. Select interpreter: `Cmd+Shift+P` → "Python: Select Interpreter"
2. Choose `.venv/bin/python`
3. UV venv works exactly like standard venv

### PyCharm

1. Settings → Project → Python Interpreter
2. Add Interpreter → Existing Environment
3. Select `.venv/bin/python`

## Why UV for This Project?

1. **Faster CI/CD** - Faster installs in GitHub Actions, etc.
2. **Better Developer Experience** - Less waiting during setup
3. **Modern Tooling** - Same team that built Ruff
4. **Drop-in Replacement** - Works with existing `pyproject.toml`
5. **No Changes Needed** - Same commands, just faster

## Resources

- **Official Site:** https://astral.sh/uv
- **GitHub:** https://github.com/astral-sh/uv
- **Documentation:** https://github.com/astral-sh/uv#readme
- **Astral (creators):** https://astral.sh

## Summary

```bash
# Complete setup in 3 commands (takes <5 seconds total!)
uv venv                    # Create venv (<1s)
source .venv/bin/activate  # Activate
uv pip install -e .        # Install (<1s)

# Start coding!
python -m uvicorn src.main:app --reload --port 3002
```

**UV makes Python dependency management as fast as pnpm/bun for Node.js!** 🚀
