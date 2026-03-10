from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from . import auth, order_models, models, customer_models, database
from typing import List, Optional
from pydantic import BaseModel
import datetime
import uuid

order_router = APIRouter(prefix="/orders", tags=["orders"])


def generate_order_number():
    now = datetime.datetime.utcnow()
    return f"ORD-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


# --- Schemas ---

class LineItemCreate(BaseModel):
    sku_id: Optional[int] = None
    sku_code: Optional[str] = None
    sku_name: str
    quantity: float = 1.0
    unit: str = "pcs"
    unit_price: float = 0.0
    gst_rate: float = 18.0
    discount_amount: float = 0.0
    notes: Optional[str] = None


class LineItemResponse(BaseModel):
    id: int
    sku_id: Optional[int]
    sku_code: Optional[str]
    sku_name: str
    quantity: float
    unit: str
    unit_price: float
    gst_rate: float
    tax_amount: float
    discount_amount: float
    line_total: float
    billed_quantity: Optional[float]
    notes: Optional[str]


class OrderCreate(BaseModel):
    customer_id: int
    priority: str = "medium"
    internal_notes: Optional[str] = None
    line_items: List[LineItemCreate] = []


class OrderUpdate(BaseModel):
    line_items: Optional[List[LineItemCreate]] = None


class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_id: int
    customer_code: Optional[str]
    customer_name: Optional[str]
    status: str
    priority: str
    order_date: str
    internal_notes: Optional[str]
    line_items: List[LineItemResponse]
    total_items: int
    total_quantity: float
    subtotal: float
    total_tax: float
    total_discount: float
    grand_total: float
    billed_at: Optional[str]
    billed_by_name: Optional[str]
    billing_notes: Optional[str]
    dispatched_at: Optional[str]
    dispatched_by_name: Optional[str]
    dispatch_notes: Optional[str]
    closed_at: Optional[str]
    payment_due_date: Optional[str]
    collected_at: Optional[str]
    collected_by_name: Optional[str]
    created_at: str
    updated_at: str
    created_by_id: int
    created_by_name: Optional[str]
    assigned_to_id: Optional[int]


def calc_line_totals(item):
    """Calculate tax and line total for a line item."""
    base = item.quantity * item.unit_price
    tax = base * (item.gst_rate / 100.0)
    return tax, base + tax - item.discount_amount


def line_item_to_response(li) -> LineItemResponse:
    return LineItemResponse(
        id=li.id,
        sku_id=li.sku_id,
        sku_code=li.sku_code,
        sku_name=li.sku_name,
        quantity=li.quantity,
        unit=li.unit or "pcs",
        unit_price=li.unit_price,
        gst_rate=li.gst_rate or 18.0,
        tax_amount=li.tax_amount or 0.0,
        discount_amount=li.discount_amount or 0.0,
        line_total=li.line_total or 0.0,
        billed_quantity=li.billed_quantity,
        notes=li.notes,
    )


def order_to_response(o) -> OrderResponse:
    items = [line_item_to_response(li) for li in (o.line_items or [])]
    subtotal = sum(li.quantity * li.unit_price for li in (o.line_items or []))
    total_tax = sum(li.tax_amount or 0 for li in (o.line_items or []))
    total_discount = sum(li.discount_amount or 0 for li in (o.line_items or []))
    grand_total = sum(li.line_total or 0 for li in (o.line_items or []))

    return OrderResponse(
        id=o.id,
        order_number=o.order_number,
        customer_id=o.customer_id,
        customer_code=o.customer.customer_code if o.customer else None,
        customer_name=o.customer.name if o.customer else None,
        status=o.status.value if o.status else "pending_billing",
        priority=o.priority.value if o.priority else "medium",
        order_date=str(o.order_date) if o.order_date else str(o.created_at),
        internal_notes=o.internal_notes,
        line_items=items,
        total_items=len(items),
        total_quantity=sum(li.quantity for li in (o.line_items or [])),
        subtotal=round(subtotal, 2),
        total_tax=round(total_tax, 2),
        total_discount=round(total_discount, 2),
        grand_total=round(grand_total, 2),
        billed_at=str(o.billed_at) if o.billed_at else None,
        billed_by_name=o.billed_by.full_name if o.billed_by else None,
        billing_notes=o.billing_notes,
        dispatched_at=str(o.dispatched_at) if o.dispatched_at else None,
        dispatched_by_name=o.dispatched_by.full_name if o.dispatched_by else None,
        dispatch_notes=o.dispatch_notes,
        closed_at=str(o.closed_at) if o.closed_at else None,
        payment_due_date=str(o.payment_due_date) if o.payment_due_date else None,
        collected_at=str(o.collected_at) if o.collected_at else None,
        collected_by_name=o.collected_by.full_name if o.collected_by else None,
        created_at=str(o.created_at),
        updated_at=str(o.updated_at),
        created_by_id=o.created_by_id,
        created_by_name=o.created_by.full_name if o.created_by else None,
        assigned_to_id=o.assigned_to_id,
    )


def get_current_user(db: Session, token: str):
    payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    user = db.query(models.User).filter(models.User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    return user


# --- Endpoints ---

@order_router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order: OrderCreate,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)

    customer = db.query(customer_models.Customer).filter(customer_models.Customer.id == order.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if not order.line_items:
        raise HTTPException(status_code=400, detail="Order must have at least one line item")

    new_order = order_models.Order(
        order_number=generate_order_number(),
        customer_id=order.customer_id,
        priority=order_models.Priority(order.priority),
        internal_notes=order.internal_notes,
        created_by_id=user.id,
    )
    db.add(new_order)
    db.flush()

    for item in order.line_items:
        tax, total = calc_line_totals(item)
        li = order_models.OrderLineItem(
            order_id=new_order.id,
            sku_id=item.sku_id,
            sku_code=item.sku_code,
            sku_name=item.sku_name,
            quantity=item.quantity,
            unit=item.unit,
            unit_price=item.unit_price,
            gst_rate=item.gst_rate,
            tax_amount=round(tax, 2),
            discount_amount=item.discount_amount,
            line_total=round(total, 2),
        )
        db.add(li)

    db.commit()
    db.refresh(new_order)
    return order_to_response(new_order)


@order_router.get("/", response_model=List[OrderResponse])
def list_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    query = db.query(order_models.Order).options(
        joinedload(order_models.Order.customer),
        joinedload(order_models.Order.line_items),
        joinedload(order_models.Order.created_by),
    )

    # Role-based visibility
    if user.role == models.UserRole.SALES_REP:
        query = query.filter(order_models.Order.created_by_id == user.id)
    elif user.role == models.UserRole.BILLING_EXEC:
        query = query.filter(
            order_models.Order.status.in_([
                order_models.OrderStatus.PENDING_BILLING,
                order_models.OrderStatus.BILLED,
            ])
        )
    elif user.role == models.UserRole.DISPATCH_AGENT:
        query = query.filter(
            order_models.Order.status.in_([
                order_models.OrderStatus.TO_BE_DISPATCHED,
                order_models.OrderStatus.DISPATCHED,
                order_models.OrderStatus.CLOSED,
            ])
        )
    elif user.role == models.UserRole.COLLECTION_EXEC:
        query = query.filter(
            order_models.Order.status.in_([
                order_models.OrderStatus.CLOSED,
                order_models.OrderStatus.COLLECTED,
            ])
        )

    if status_filter:
        query = query.filter(order_models.Order.status == order_models.OrderStatus(status_filter))
    if customer_id:
        query = query.filter(order_models.Order.customer_id == customer_id)
    if search:
        search_term = f"%{search}%"
        query = query.join(customer_models.Customer).filter(
            (order_models.Order.order_number.ilike(search_term))
            | (customer_models.Customer.name.ilike(search_term))
            | (customer_models.Customer.customer_code.ilike(search_term))
        )

    orders = query.order_by(order_models.Order.created_at.desc()).all()
    return [order_to_response(o) for o in orders]


@order_router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    order = (
        db.query(order_models.Order)
        .options(
            joinedload(order_models.Order.customer),
            joinedload(order_models.Order.line_items),
            joinedload(order_models.Order.created_by),
        )
        .filter(order_models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order_to_response(order)


@order_router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    order: OrderUpdate,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    db_order = (
        db.query(order_models.Order)
        .options(joinedload(order_models.Order.customer), joinedload(order_models.Order.line_items))
        .filter(order_models.Order.id == order_id)
        .first()
    )
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    if db_order.status != order_models.OrderStatus.PENDING_BILLING and user.role != models.UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Order can only be edited before billing confirmation")

    update_data = order.dict(exclude_unset=True)

    # Handle line_items replacement
    if "line_items" in update_data and update_data["line_items"] is not None:
        if db_order.status != order_models.OrderStatus.PENDING_BILLING:
            raise HTTPException(status_code=400, detail="Line items can only be changed before billing")
        if not update_data["line_items"]:
            raise HTTPException(status_code=400, detail="Order must have at least one line item")
        # Remove existing line items
        for li in list(db_order.line_items):
            db.delete(li)
        db.flush()
        # Add new line items
        for item_data in update_data["line_items"]:
            item = LineItemCreate(**item_data)
            tax, total = calc_line_totals(item)
            li = order_models.OrderLineItem(
                order_id=db_order.id,
                sku_id=item.sku_id,
                sku_code=item.sku_code,
                sku_name=item.sku_name,
                quantity=item.quantity,
                unit=item.unit,
                unit_price=item.unit_price,
                gst_rate=item.gst_rate,
                tax_amount=round(tax, 2),
                discount_amount=item.discount_amount,
                line_total=round(total, 2),
            )
            db.add(li)

    for field, value in update_data.items():
        if field == "line_items":
            continue
        setattr(db_order, field, value)

    db.commit()
    db.refresh(db_order)
    return order_to_response(db_order)


# --- Workflow Transition Endpoints ---

class BillingConfirm(BaseModel):
    billing_notes: Optional[str] = None
    line_adjustments: Optional[List[dict]] = None


@order_router.post("/{order_id}/confirm-billing", response_model=OrderResponse)
def confirm_billing(
    order_id: int,
    data: BillingConfirm,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    if user.role not in (models.UserRole.BILLING_EXEC, models.UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Only billing executives or managers can confirm billing")

    db_order = (
        db.query(order_models.Order)
        .options(joinedload(order_models.Order.customer), joinedload(order_models.Order.line_items))
        .filter(order_models.Order.id == order_id)
        .first()
    )
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    if db_order.status != order_models.OrderStatus.PENDING_BILLING:
        raise HTTPException(status_code=400, detail="Order is not pending billing")

    if data.line_adjustments:
        for adj in data.line_adjustments:
            li = db.query(order_models.OrderLineItem).filter(
                order_models.OrderLineItem.id == adj.get("line_item_id"),
                order_models.OrderLineItem.order_id == order_id,
            ).first()
            if li and adj.get("billed_quantity") is not None:
                li.billed_quantity = adj["billed_quantity"]

    db_order.status = order_models.OrderStatus.BILLED
    db_order.billed_at = datetime.datetime.utcnow()
    db_order.billed_by_id = user.id
    db_order.billing_notes = data.billing_notes

    db.commit()
    db.refresh(db_order)
    return order_to_response(db_order)


@order_router.post("/{order_id}/mark-ready-dispatch", response_model=OrderResponse)
def mark_ready_for_dispatch(
    order_id: int,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    if user.role not in (models.UserRole.BILLING_EXEC, models.UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Not authorized")

    db_order = (
        db.query(order_models.Order)
        .options(joinedload(order_models.Order.customer), joinedload(order_models.Order.line_items))
        .filter(order_models.Order.id == order_id)
        .first()
    )
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    if db_order.status != order_models.OrderStatus.BILLED:
        raise HTTPException(status_code=400, detail="Order must be billed first")

    db_order.status = order_models.OrderStatus.TO_BE_DISPATCHED
    db.commit()
    db.refresh(db_order)
    return order_to_response(db_order)


class DispatchData(BaseModel):
    dispatch_notes: Optional[str] = None


@order_router.post("/{order_id}/dispatch", response_model=OrderResponse)
def dispatch_order(
    order_id: int,
    data: DispatchData,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    if user.role not in (models.UserRole.DISPATCH_AGENT, models.UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Only dispatch agents or managers can dispatch")

    db_order = (
        db.query(order_models.Order)
        .options(joinedload(order_models.Order.customer), joinedload(order_models.Order.line_items))
        .filter(order_models.Order.id == order_id)
        .first()
    )
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    if db_order.status != order_models.OrderStatus.TO_BE_DISPATCHED:
        raise HTTPException(status_code=400, detail="Order is not ready for dispatch")

    db_order.status = order_models.OrderStatus.DISPATCHED
    db_order.dispatched_at = datetime.datetime.utcnow()
    db_order.dispatched_by_id = user.id
    db_order.dispatch_notes = data.dispatch_notes
    db.commit()
    db.refresh(db_order)
    return order_to_response(db_order)


@order_router.post("/{order_id}/close", response_model=OrderResponse)
def close_order(
    order_id: int,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    if user.role not in (models.UserRole.DISPATCH_AGENT, models.UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Not authorized")

    db_order = (
        db.query(order_models.Order)
        .options(joinedload(order_models.Order.customer), joinedload(order_models.Order.line_items))
        .filter(order_models.Order.id == order_id)
        .first()
    )
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    if db_order.status != order_models.OrderStatus.DISPATCHED:
        raise HTTPException(status_code=400, detail="Order must be dispatched first")

    db_order.status = order_models.OrderStatus.CLOSED
    db_order.closed_at = datetime.datetime.utcnow()
    db_order.actual_delivery_date = datetime.datetime.utcnow()

    if db_order.customer and db_order.customer.net_payment_terms:
        db_order.payment_due_date = db_order.closed_at + datetime.timedelta(
            days=db_order.customer.net_payment_terms
        )

    db.commit()
    db.refresh(db_order)
    return order_to_response(db_order)


@order_router.post("/{order_id}/collect", response_model=OrderResponse)
def mark_collected(
    order_id: int,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    if user.role not in (models.UserRole.COLLECTION_EXEC, models.UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Not authorized")

    db_order = (
        db.query(order_models.Order)
        .options(joinedload(order_models.Order.customer), joinedload(order_models.Order.line_items))
        .filter(order_models.Order.id == order_id)
        .first()
    )
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    if db_order.status != order_models.OrderStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Order must be closed/delivered first")

    db_order.status = order_models.OrderStatus.COLLECTED
    db_order.collected_at = datetime.datetime.utcnow()
    db_order.collected_by_id = user.id
    db.commit()
    db.refresh(db_order)
    return order_to_response(db_order)


@order_router.post("/{order_id}/reverse-collection", response_model=OrderResponse)
def reverse_collection(
    order_id: int,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    if user.role != models.UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can reverse collections")

    db_order = (
        db.query(order_models.Order)
        .options(joinedload(order_models.Order.customer), joinedload(order_models.Order.line_items))
        .filter(order_models.Order.id == order_id)
        .first()
    )
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    if db_order.status != order_models.OrderStatus.COLLECTED:
        raise HTTPException(status_code=400, detail="Order is not marked as collected")

    db_order.status = order_models.OrderStatus.CLOSED
    db_order.collected_at = None
    db_order.collected_by_id = None
    db.commit()
    db.refresh(db_order)
    return order_to_response(db_order)


@order_router.delete("/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    if user.role != models.UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can delete orders")

    db_order = db.query(order_models.Order).filter(order_models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(db_order)
    db.commit()
    return {"message": "Order deleted"}
