"""
BEMS Application Server Entrypoint.
Root-level entry point used by Render.com (and local dev).
Delegates all logic to modular backend/server.py.
"""
import os
import sys

# Ensure the project root is on sys.path so `backend.*` imports resolve
# whether this file is run directly or from a subprocess by Render/gunicorn.
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.server import app  # noqa: E402

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting BEMS Backend on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
