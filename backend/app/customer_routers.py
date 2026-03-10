from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from . import auth, customer_models, models, database
from typing import List, Optional
from pydantic import BaseModel
import datetime

customer_router = APIRouter(prefix="/customers", tags=["customers"])


def generate_customer_code(db: Session):
    last = db.query(customer_models.Customer).order_by(customer_models.Customer.id.desc()).first()
    next_num = (last.id + 1) if last else 1
    return f"CUST-{next_num:05d}"


class CustomerCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone_primary: str
    phone_secondary: Optional[str] = None
    email_primary: Optional[str] = None
    email_secondary: Optional[str] = None
    preferred_communication: str = "phone"
    billing_address_line1: Optional[str] = None
    billing_address_line2: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_pincode: Optional[str] = None
    shipping_address_line1: Optional[str] = None
    shipping_address_line2: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_pincode: Optional[str] = None
    category: str = "silver"
    net_payment_terms: int = 30
    credit_limit: float = 0.0
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    assigned_sales_rep_id: Optional[int] = None
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone_primary: Optional[str] = None
    phone_secondary: Optional[str] = None
    email_primary: Optional[str] = None
    email_secondary: Optional[str] = None
    preferred_communication: Optional[str] = None
    billing_address_line1: Optional[str] = None
    billing_address_line2: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_pincode: Optional[str] = None
    shipping_address_line1: Optional[str] = None
    shipping_address_line2: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_pincode: Optional[str] = None
    category: Optional[str] = None
    net_payment_terms: Optional[int] = None
    credit_limit: Optional[float] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    assigned_sales_rep_id: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CustomerResponse(BaseModel):
    id: int
    customer_code: str
    name: str
    contact_person: Optional[str]
    phone_primary: str
    phone_secondary: Optional[str]
    email_primary: Optional[str]
    email_secondary: Optional[str]
    preferred_communication: str
    billing_address_line1: Optional[str]
    billing_address_line2: Optional[str]
    billing_city: Optional[str]
    billing_state: Optional[str]
    billing_pincode: Optional[str]
    shipping_address_line1: Optional[str]
    shipping_address_line2: Optional[str]
    shipping_city: Optional[str]
    shipping_state: Optional[str]
    shipping_pincode: Optional[str]
    category: str
    net_payment_terms: int
    credit_limit: float
    gst_number: Optional[str]
    pan_number: Optional[str]
    assigned_sales_rep_id: Optional[int]
    assigned_sales_rep_name: Optional[str]
    status: str
    notes: Optional[str]
    created_at: str
    updated_at: str


def customer_to_response(c) -> CustomerResponse:
    return CustomerResponse(
        id=c.id,
        customer_code=c.customer_code,
        name=c.name,
        contact_person=c.contact_person,
        phone_primary=c.phone_primary,
        phone_secondary=c.phone_secondary,
        email_primary=c.email_primary,
        email_secondary=c.email_secondary,
        preferred_communication=c.preferred_communication or "phone",
        billing_address_line1=c.billing_address_line1,
        billing_address_line2=c.billing_address_line2,
        billing_city=c.billing_city,
        billing_state=c.billing_state,
        billing_pincode=c.billing_pincode,
        shipping_address_line1=c.shipping_address_line1,
        shipping_address_line2=c.shipping_address_line2,
        shipping_city=c.shipping_city,
        shipping_state=c.shipping_state,
        shipping_pincode=c.shipping_pincode,
        category=c.category.value if c.category else "silver",
        net_payment_terms=c.net_payment_terms or 30,
        credit_limit=c.credit_limit or 0.0,
        gst_number=c.gst_number,
        pan_number=c.pan_number,
        assigned_sales_rep_id=c.assigned_sales_rep_id,
        assigned_sales_rep_name=c.assigned_sales_rep.full_name if c.assigned_sales_rep else None,
        status=c.status.value if c.status else "active",
        notes=c.notes,
        created_at=str(c.created_at),
        updated_at=str(c.updated_at),
    )


def get_current_user(db: Session, token: str):
    payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    user = db.query(models.User).filter(models.User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    return user


@customer_router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    cust: CustomerCreate,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    # Only Manager can create customers
    if user.role != models.UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can create customers")

    new_customer = customer_models.Customer(
        customer_code=generate_customer_code(db),
        name=cust.name,
        contact_person=cust.contact_person,
        phone_primary=cust.phone_primary,
        phone_secondary=cust.phone_secondary,
        email_primary=cust.email_primary,
        email_secondary=cust.email_secondary,
        preferred_communication=cust.preferred_communication,
        billing_address_line1=cust.billing_address_line1,
        billing_address_line2=cust.billing_address_line2,
        billing_city=cust.billing_city,
        billing_state=cust.billing_state,
        billing_pincode=cust.billing_pincode,
        shipping_address_line1=cust.shipping_address_line1,
        shipping_address_line2=cust.shipping_address_line2,
        shipping_city=cust.shipping_city,
        shipping_state=cust.shipping_state,
        shipping_pincode=cust.shipping_pincode,
        category=customer_models.CustomerCategory(cust.category),
        net_payment_terms=cust.net_payment_terms,
        credit_limit=cust.credit_limit,
        gst_number=cust.gst_number,
        pan_number=cust.pan_number,
        assigned_sales_rep_id=cust.assigned_sales_rep_id,
        notes=cust.notes,
        created_by_id=user.id,
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return customer_to_response(new_customer)


@customer_router.get("/", response_model=List[CustomerResponse])
def list_customers(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    query = db.query(customer_models.Customer)

    # Sales rep sees only assigned customers
    if user.role == models.UserRole.SALES_REP:
        query = query.filter(customer_models.Customer.assigned_sales_rep_id == user.id)

    if status_filter:
        query = query.filter(customer_models.Customer.status == customer_models.CustomerStatus(status_filter))
    if category:
        query = query.filter(customer_models.Customer.category == customer_models.CustomerCategory(category))
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (customer_models.Customer.name.ilike(search_term))
            | (customer_models.Customer.customer_code.ilike(search_term))
            | (customer_models.Customer.phone_primary.ilike(search_term))
        )

    customers = query.order_by(customer_models.Customer.name).all()
    return [customer_to_response(c) for c in customers]


@customer_router.get("/autocomplete", response_model=List[CustomerResponse])
def autocomplete_customers(
    q: str = "",
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    """Lightweight search for order creation autocomplete."""
    query = db.query(customer_models.Customer).filter(
        customer_models.Customer.status == customer_models.CustomerStatus.ACTIVE
    )
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            (customer_models.Customer.name.ilike(search_term))
            | (customer_models.Customer.customer_code.ilike(search_term))
        )
    return [customer_to_response(c) for c in query.limit(20).all()]


@customer_router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    customer = db.query(customer_models.Customer).filter(customer_models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer_to_response(customer)


@customer_router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    cust: CustomerUpdate,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    if user.role != models.UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can edit customers")

    db_customer = db.query(customer_models.Customer).filter(customer_models.Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = cust.dict(exclude_unset=True)
    enum_fields = {
        "category": customer_models.CustomerCategory,
        "status": customer_models.CustomerStatus,
    }

    for field, value in update_data.items():
        if field in enum_fields and value is not None:
            setattr(db_customer, field, enum_fields[field](value))
        else:
            setattr(db_customer, field, value)

    db.commit()
    db.refresh(db_customer)
    return customer_to_response(db_customer)


@customer_router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    if user.role != models.UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can delete customers")

    db_customer = db.query(customer_models.Customer).filter(customer_models.Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    db.delete(db_customer)
    db.commit()
    return {"message": "Customer deleted"}
