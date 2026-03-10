from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(order_router, prefix="/api")
app.include_router(customer_router, prefix="/api")
app.include_router(sku_router, prefix="/api")
app.include_router(user_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "OrderFlow Management Platform - Backend is running."}
