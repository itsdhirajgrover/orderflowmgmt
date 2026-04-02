import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Text, Float
from sqlalchemy.orm import relationship
from .database import Base
import datetime


class OrderStatus(enum.Enum):
    PENDING_BILLING = "pending_billing"
    BILLED = "billed"
    TO_BE_DISPATCHED = "to_be_dispatched"
    DISPATCHED = "dispatched"
    CLOSED = "closed"
    COLLECTED = "collected"
    CANCELLED = "cancelled"


class Priority(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(30), unique=True, nullable=False, index=True)

    # Customer reference
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    customer = relationship("Customer", foreign_keys=[customer_id])

    # Status & Priority
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING_BILLING, nullable=False)
    priority = Column(Enum(Priority), default=Priority.MEDIUM, nullable=False)

    # Order date
    order_date = Column(DateTime, default=datetime.datetime.utcnow)

    # Notes
    internal_notes = Column(Text, nullable=True)

    # Billing
    billed_at = Column(DateTime, nullable=True)
    billed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    billed_by = relationship("User", foreign_keys=[billed_by_id])
    billing_notes = Column(Text, nullable=True)

    # Dispatch
    dispatched_at = Column(DateTime, nullable=True)
    dispatched_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    dispatched_by = relationship("User", foreign_keys=[dispatched_by_id])
    dispatch_notes = Column(Text, nullable=True)

    # Closure / Delivery
    closed_at = Column(DateTime, nullable=True)
    actual_delivery_date = Column(DateTime, nullable=True)

    # Collection
    payment_due_date = Column(DateTime, nullable=True)
    collected_at = Column(DateTime, nullable=True)
    collected_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    collected_by = relationship("User", foreign_keys=[collected_by_id])

    # Timestamps & Ownership
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_by = relationship("User", foreign_keys=[created_by_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

    # Split order tracking
    parent_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    parent_order = relationship("Order", remote_side=[id], foreign_keys=[parent_order_id], backref="child_orders")
    split_notes = Column(Text, nullable=True)

    # Line items relationship
    line_items = relationship("OrderLineItem", back_populates="order", cascade="all, delete-orphan")

    # Payment installments
    payment_installments = relationship("PaymentInstallment", back_populates="order", cascade="all, delete-orphan")

    # Notification history
    notifications = relationship("OrderNotification", back_populates="order", cascade="all, delete-orphan")


class OrderNotification(Base):
    __tablename__ = "order_notifications"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    event = Column(String(80), nullable=False)
    channel = Column(String(20), nullable=False, default="sms")
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending, sent, failed
    sent_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    order = relationship("Order", back_populates="notifications")


class PaymentInstallment(Base):
    __tablename__ = "payment_installments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    month = Column(String(7), nullable=False)  # "YYYY-MM" format
    amount = Column(Float, default=0.0, nullable=False)
    notes = Column(Text, nullable=True)
    collected_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    collected_by = relationship("User", foreign_keys=[collected_by_id])
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    order = relationship("Order", back_populates="payment_installments")


class OrderLineItem(Base):
    __tablename__ = "order_line_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    sku_id = Column(Integer, ForeignKey("skus.id"), nullable=True)
    sku_code = Column(String(50), nullable=True)
    sku_name = Column(String(200), nullable=False)
    quantity = Column(Float, default=1.0, nullable=False)
    unit = Column(String(20), default="pcs")
    unit_price = Column(Float, default=0.0, nullable=False)
    gst_rate = Column(Float, default=18.0)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    line_total = Column(Float, default=0.0)
    billed_quantity = Column(Float, nullable=True)  # Billing exec can adjust
    notes = Column(Text, nullable=True)

    order = relationship("Order", back_populates="line_items")
    sku = relationship("SKU", foreign_keys=[sku_id])
