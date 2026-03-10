from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from . import auth, models, database, order_models, user_detail_models
from typing import List, Optional
from pydantic import BaseModel
import datetime

user_router = APIRouter(prefix="/users", tags=["users"])


# --- Schemas ---

class ContactCreate(BaseModel):
    contact_type: str
    contact_value: str
    is_primary: bool = False


class ContactResponse(BaseModel):
    id: int
    contact_type: str
    contact_value: str
    is_primary: bool


class AddressCreate(BaseModel):
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"
    is_primary: bool = True


class AddressResponse(BaseModel):
    id: int
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str
    is_primary: bool


class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    mobile: str
    password: str
    role: str = "sales_rep"
    is_active: bool = True
    contacts: List[ContactCreate] = []
    addresses: List[AddressCreate] = []


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    contacts: Optional[List[ContactCreate]] = None
    addresses: Optional[List[AddressCreate]] = None


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    mobile: str
    role: str
    is_active: bool
    created_at: str
    updated_at: str
    contacts: List[ContactResponse] = []
    addresses: List[AddressResponse] = []


def user_to_response(user: models.User) -> UserResponse:
    contacts = []
    for c in (user.contacts or []):
        contacts.append(ContactResponse(
            id=c.id,
            contact_type=c.contact_type.value,
            contact_value=c.contact_value,
            is_primary=c.is_primary,
        ))
    addresses = []
    for a in (user.addresses or []):
        addresses.append(AddressResponse(
            id=a.id,
            address_line1=a.address_line1,
            address_line2=a.address_line2,
            city=a.city,
            state=a.state,
            postal_code=a.postal_code,
            country=a.country,
            is_primary=a.is_primary,
        ))
    return UserResponse(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        mobile=user.mobile,
        role=user.role.value,
        is_active=user.is_active,
        created_at=str(user.created_at),
        updated_at=str(user.updated_at),
        contacts=contacts,
        addresses=addresses,
    )


def get_current_user(db: Session, token: str) -> models.User:
    payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    user = db.query(models.User).filter(models.User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    return user


# --- Endpoints ---

@user_router.get("/me", response_model=UserResponse)
def get_me(
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    """Return the currently authenticated user's info."""
    user = get_current_user(db, token)
    return user_to_response(user)


@user_router.get("/dashboard-stats")
def dashboard_stats(
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    """Return aggregated stats for the dashboard."""
    user = get_current_user(db, token)

    # Count orders by status
    status_counts = (
        db.query(order_models.Order.status, func.count(order_models.Order.id))
        .group_by(order_models.Order.status)
        .all()
    )
    counts = {s.value: c for s, c in status_counts}

    # Total revenue (grand total of all non-cancelled orders)
    total_revenue = (
        db.query(func.sum(order_models.OrderLineItem.line_total))
        .join(order_models.Order)
        .filter(order_models.Order.status != order_models.OrderStatus.CANCELLED)
        .scalar()
    ) or 0

    # Count totals
    total_orders = db.query(func.count(order_models.Order.id)).scalar() or 0
    total_customers = db.query(func.count()).select_from(
        db.query(order_models.Order.customer_id).distinct().subquery()
    ).scalar() or 0

    return {
        "status_counts": counts,
        "total_orders": total_orders,
        "total_revenue": round(float(total_revenue), 2),
        "total_customers": total_customers,
        "pending_billing": counts.get("pending_billing", 0),
        "to_be_dispatched": counts.get("to_be_dispatched", 0),
        "pending_collection": counts.get("closed", 0),
    }


@user_router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    """List all users. Accessible by managers; other roles get limited view."""
    user = get_current_user(db, token)
    users = db.query(models.User).options(
        joinedload(models.User.contacts),
        joinedload(models.User.addresses),
    ).order_by(models.User.created_at.desc()).all()
    return [user_to_response(u) for u in users]


@user_router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    """Create a new user. Manager only."""
    current = get_current_user(db, token)
    if current.role != models.UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can create users")

    existing = db.query(models.User).filter(
        (models.User.email == data.email) | (models.User.mobile == data.mobile)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email or mobile already exists")

    new_user = models.User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        mobile=data.mobile,
        hashed_password=auth.get_password_hash(data.password),
        role=models.UserRole(data.role),
        is_active=data.is_active,
    )
    db.add(new_user)
    db.flush()

    for c in data.contacts:
        db.add(user_detail_models.UserContact(
            user_id=new_user.id,
            contact_type=user_detail_models.ContactType(c.contact_type),
            contact_value=c.contact_value,
            is_primary=c.is_primary,
        ))

    for a in data.addresses:
        db.add(user_detail_models.UserAddress(
            user_id=new_user.id,
            address_line1=a.address_line1,
            address_line2=a.address_line2,
            city=a.city,
            state=a.state,
            postal_code=a.postal_code,
            country=a.country,
            is_primary=a.is_primary,
        ))

    db.commit()
    db.refresh(new_user)
    return user_to_response(new_user)


@user_router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = db.query(models.User).options(
        joinedload(models.User.contacts),
        joinedload(models.User.addresses),
    ).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_response(user)


@user_router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    current = get_current_user(db, token)
    if current.role != models.UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can update users")

    user = db.query(models.User).options(
        joinedload(models.User.contacts),
        joinedload(models.User.addresses),
    ).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = data.dict(exclude_unset=True)

    # Handle contacts replacement
    if "contacts" in update_data and data.contacts is not None:
        db.query(user_detail_models.UserContact).filter(
            user_detail_models.UserContact.user_id == user_id
        ).delete()
        for c in data.contacts:
            db.add(user_detail_models.UserContact(
                user_id=user_id,
                contact_type=user_detail_models.ContactType(c.contact_type),
                contact_value=c.contact_value,
                is_primary=c.is_primary,
            ))
        del update_data["contacts"]

    # Handle addresses replacement
    if "addresses" in update_data and data.addresses is not None:
        db.query(user_detail_models.UserAddress).filter(
            user_detail_models.UserAddress.user_id == user_id
        ).delete()
        for a in data.addresses:
            db.add(user_detail_models.UserAddress(
                user_id=user_id,
                address_line1=a.address_line1,
                address_line2=a.address_line2,
                city=a.city,
                state=a.state,
                postal_code=a.postal_code,
                country=a.country,
                is_primary=a.is_primary,
            ))
        del update_data["addresses"]

    for field, value in update_data.items():
        if field == "password" and value:
            user.hashed_password = auth.get_password_hash(value)
        elif field == "role" and value:
            user.role = models.UserRole(value)
        else:
            setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user_to_response(user)
