"""
PythonAnywhere WSGI configuration file.
Copy the contents of this file into your PythonAnywhere WSGI file at:
  /var/www/<username>_pythonanywhere_com_wsgi.py

Replace <username> with your actual PythonAnywhere username.
Replace <your_password> with your PythonAnywhere MySQL password.
Replace <your_secret> with a strong random secret key.
"""
import sys
import os

# === CHANGE THESE ===
USERNAME = "your_pythonanywhere_username"  # <-- Replace this
MYSQL_PASSWORD = "your_mysql_password"     # <-- Replace this
JWT_SECRET = "change_this_to_a_random_secret_key"  # <-- Replace this
# ====================

# Project path
PROJECT_DIR = f"/home/{USERNAME}/OrderFlowMgmt"
BACKEND_DIR = f"{PROJECT_DIR}/backend"
VENV_DIR = f"/home/{USERNAME}/.virtualenvs/orderflow/lib/python3.10/site-packages"

# Add paths
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if os.path.exists(VENV_DIR):
    sys.path.insert(0, VENV_DIR)

# Set environment variables BEFORE importing the app
os.environ["DATABASE_URL"] = (
    f"mysql+pymysql://{USERNAME}:{MYSQL_PASSWORD}"
    f"@{USERNAME}.mysql.pythonanywhere-services.com/{USERNAME}$ordermgmt"
)
os.environ["JWT_SECRET"] = JWT_SECRET

# Import FastAPI app and wrap with WSGI adapter
from a2wsgi import ASGIMiddleware
from backend.app.main import app

application = ASGIMiddleware(app)
