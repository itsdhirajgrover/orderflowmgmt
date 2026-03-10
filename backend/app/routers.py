from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from . import auth, models, database, otp_service

router = APIRouter()

@router.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(auth.get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token({"sub": user.email, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}

# OTP endpoints
from pydantic import BaseModel
import random

class OTPRequest(BaseModel):
    mobile: str

class OTPVerifyRequest(BaseModel):
    mobile: str
    otp: str

otp_store = {}

@router.post("/send-otp")
def send_otp(data: OTPRequest):
    otp = str(random.randint(100000, 999999))
    otp_store[data.mobile] = otp
    sent = otp_service.OTPService.send_otp(data.mobile, otp)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP")
    return {"message": "OTP sent"}

@router.post("/verify-otp")
def verify_otp(data: OTPVerifyRequest):
    valid = otp_store.get(data.mobile) == data.otp
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    # Optionally, mark user as verified in DB
    return {"message": "OTP verified"}
