import enum
import datetime
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Text, Float, Boolean
from sqlalchemy.orm import relationship
from .database import Base


class CustomerCategory(enum.Enum):
    PLATINUM = "platinum"
    GOLD = "gold"
    SILVER = "silver"
    BRONZE = "bronze"


class CustomerStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLOCKED = "blocked"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    contact_person = Column(String(200), nullable=True)

    # Contact
    phone_primary = Column(String(20), nullable=False)
    phone_secondary = Column(String(20), nullable=True)
    email_primary = Column(String(255), nullable=True)
    email_secondary = Column(String(255), nullable=True)
    preferred_communication = Column(String(20), default="phone")  # phone, email, whatsapp

    # Billing Address
    billing_address_line1 = Column(String(500), nullable=True)
    billing_address_line2 = Column(String(500), nullable=True)
    billing_city = Column(String(100), nullable=True)
    billing_state = Column(String(100), nullable=True)
    billing_pincode = Column(String(10), nullable=True)

    # Shipping Address
    shipping_address_line1 = Column(String(500), nullable=True)
    shipping_address_line2 = Column(String(500), nullable=True)
    shipping_city = Column(String(100), nullable=True)
    shipping_state = Column(String(100), nullable=True)
    shipping_pincode = Column(String(10), nullable=True)

    # Business
    category = Column(Enum(CustomerCategory), default=CustomerCategory.SILVER, nullable=False)
    net_payment_terms = Column(Integer, default=30)  # days
    credit_limit = Column(Float, default=0.0)
    gst_number = Column(String(20), nullable=True)
    pan_number = Column(String(20), nullable=True)

    # Assignment
    assigned_sales_rep_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_sales_rep = relationship("User", foreign_keys=[assigned_sales_rep_id])

    # Status
    status = Column(Enum(CustomerStatus), default=CustomerStatus.ACTIVE, nullable=False)
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", foreign_keys=[created_by_id])
