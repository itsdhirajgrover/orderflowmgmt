import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .routers import router
from .order_routers import order_router
from .customer_routers import customer_router
from .sku_routers import sku_router
from .user_routers import user_router
from .database import engine, Base
from . import models, order_models, customer_models, sku_models, user_detail_models

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="OrderFlow Management Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(order_router, prefix="/api")
app.include_router(customer_router, prefix="/api")
app.include_router(sku_router, prefix="/api")
app.include_router(user_router, prefix="/api")

# Serve React build (static files) — for demo deployment
FRONTEND_BUILD = Path(__file__).resolve().parent.parent.parent / "frontend" / "build"

if FRONTEND_BUILD.is_dir():
    # Serve static assets (JS, CSS, images)
    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD / "static")), name="static")

    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        """Serve React SPA — all non-API routes return index.html."""
        file_path = FRONTEND_BUILD / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_BUILD / "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"message": "OrderFlow Management Platform - Backend is running. Build frontend with 'cd frontend && npm run build' to enable the UI."}
