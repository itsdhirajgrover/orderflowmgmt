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

# Project path
PROJECT_DIR = os.getenv("PROJECT_DIR", "/home/<username>/OrderFlowMgmt")
BACKEND_DIR = os.getenv("BACKEND_DIR", f"{PROJECT_DIR}/backend")
VENV_DIR = os.getenv("VENV_DIR", "/home/<username>/.virtualenvs/orderflow/lib/python3.10/site-packages")

# Add paths
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if os.path.exists(VENV_DIR):
    sys.path.insert(0, VENV_DIR)

# Optionally set final environment variables if missing
if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = os.getenv("PA_DATABASE_URL", "mysql+pymysql://<username>:<password>@<username>.mysql.pythonanywhere-services.com/<username>$ordermgmt")

if "JWT_SECRET" not in os.environ:
    os.environ["JWT_SECRET"] = os.getenv("PA_JWT_SECRET", "change_this_to_a_random_secret_key")

# Import FastAPI app and wrap with WSGI adapter
from a2wsgi import ASGIMiddleware
from backend.app.main import app

application = ASGIMiddleware(app)
