from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from . import auth, sku_models, models, database
from typing import List, Optional
from pydantic import BaseModel

sku_router = APIRouter(prefix="/skus", tags=["skus"])


def get_current_user(db: Session, token: str):
    payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    user = db.query(models.User).filter(models.User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    return user


def generate_sku_code(db: Session):
    last = db.query(sku_models.SKU).order_by(sku_models.SKU.id.desc()).first()
    next_num = (last.id + 1) if last else 1
    return f"SKU-{next_num:05d}"


class SKUCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit: str = "pcs"
    hsn_code: Optional[str] = None
    gst_rate: float = 18.0
    base_price: float = 0.0


class SKUUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    base_price: Optional[float] = None
    status: Optional[str] = None


class SKUResponse(BaseModel):
    id: int
    sku_code: str
    name: str
    description: Optional[str]
    category: Optional[str]
    unit: str
    hsn_code: Optional[str]
    gst_rate: float
    base_price: float
    status: str
    created_at: str
    updated_at: str


def sku_to_response(s) -> SKUResponse:
    return SKUResponse(
        id=s.id,
        sku_code=s.sku_code,
        name=s.name,
        description=s.description,
        category=s.category,
        unit=s.unit or "pcs",
        hsn_code=s.hsn_code,
        gst_rate=s.gst_rate or 18.0,
        base_price=s.base_price or 0.0,
        status=s.status.value if s.status else "active",
        created_at=str(s.created_at),
        updated_at=str(s.updated_at),
    )


@sku_router.post("/", response_model=SKUResponse, status_code=status.HTTP_201_CREATED)
def create_sku(
    sku: SKUCreate,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    if user.role != models.UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can create SKUs")

    new_sku = sku_models.SKU(
        sku_code=generate_sku_code(db),
        name=sku.name,
        description=sku.description,
        category=sku.category,
        unit=sku.unit,
        hsn_code=sku.hsn_code,
        gst_rate=sku.gst_rate,
        base_price=sku.base_price,
    )
    db.add(new_sku)
    db.commit()
    db.refresh(new_sku)
    return sku_to_response(new_sku)


@sku_router.get("/", response_model=List[SKUResponse])
def list_skus(
    search: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    query = db.query(sku_models.SKU)
    if status_filter:
        query = query.filter(sku_models.SKU.status == sku_models.SKUStatus(status_filter))
    if category:
        query = query.filter(sku_models.SKU.category.ilike(f"%{category}%"))
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (sku_models.SKU.name.ilike(search_term))
            | (sku_models.SKU.sku_code.ilike(search_term))
        )
    return [sku_to_response(s) for s in query.order_by(sku_models.SKU.name).all()]


@sku_router.get("/autocomplete", response_model=List[SKUResponse])
def autocomplete_skus(
    q: str = "",
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    query = db.query(sku_models.SKU).filter(sku_models.SKU.status == sku_models.SKUStatus.ACTIVE)
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            (sku_models.SKU.name.ilike(search_term))
            | (sku_models.SKU.sku_code.ilike(search_term))
        )
    return [sku_to_response(s) for s in query.limit(20).all()]


@sku_router.get("/{sku_id}", response_model=SKUResponse)
def get_sku(
    sku_id: int,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    sku = db.query(sku_models.SKU).filter(sku_models.SKU.id == sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    return sku_to_response(sku)


@sku_router.put("/{sku_id}", response_model=SKUResponse)
def update_sku(
    sku_id: int,
    sku: SKUUpdate,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    if user.role != models.UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can update SKUs")

    db_sku = db.query(sku_models.SKU).filter(sku_models.SKU.id == sku_id).first()
    if not db_sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    update_data = sku.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "status" and value is not None:
            setattr(db_sku, field, sku_models.SKUStatus(value))
        else:
            setattr(db_sku, field, value)

    db.commit()
    db.refresh(db_sku)
    return sku_to_response(db_sku)


@sku_router.delete("/{sku_id}")
def delete_sku(
    sku_id: int,
    db: Session = Depends(auth.get_db),
    token: str = Depends(auth.oauth2_scheme),
):
    user = get_current_user(db, token)
    if user.role != models.UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can delete SKUs")

    db_sku = db.query(sku_models.SKU).filter(sku_models.SKU.id == sku_id).first()
    if not db_sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    db.delete(db_sku)
    db.commit()
    return {"message": "SKU deleted"}
