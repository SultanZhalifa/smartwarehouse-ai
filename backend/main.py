"""
Smart Warehouse API — Backward Compatibility Wrapper
======================================================
This file preserves backward compatibility so that
`python main.py` still works. All logic has been
refactored into modular packages under:
    - config.py
    - database.py
    - services/
    - routes/
    - app.py (primary entry point)
"""

# Import the app instance from the new entry point
from app import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
