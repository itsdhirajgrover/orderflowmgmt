import enum
import datetime
from sqlalchemy import Column, Integer, String, Enum, Float, Boolean, DateTime, Text
from .database import Base


class SKUStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"


class SKU(Base):
    __tablename__ = "skus"

    id = Column(Integer, primary_key=True, index=True)
    sku_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    unit = Column(String(20), default="pcs")  # pcs, kg, ltr, mtr, etc.
    hsn_code = Column(String(20), nullable=True)
    gst_rate = Column(Float, default=18.0)
    base_price = Column(Float, default=0.0)
    status = Column(Enum(SKUStatus), default=SKUStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
