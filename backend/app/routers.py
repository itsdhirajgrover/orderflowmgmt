from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
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
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    access_token = auth.create_access_token({"sub": user.email, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}


# --- OTP Login Flow ---

class OTPRequest(BaseModel):
    mobile: str


class OTPVerifyRequest(BaseModel):
    mobile: str
    otp: str


@router.post("/otp/send")
def send_otp(data: OTPRequest, db: Session = Depends(auth.get_db)):
    """Send OTP to a registered mobile number."""
    mobile = data.mobile.strip()
    if not mobile:
        raise HTTPException(status_code=400, detail="Mobile number is required")

    # Verify user exists with this mobile
    user = db.query(models.User).filter(models.User.mobile == mobile).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this mobile number")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    otp = otp_service.generate_otp()
    otp_service.store_otp(mobile, otp)
    sent = otp_service.send_otp_sms(mobile, otp)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP. Please try again.")

    return {"message": "OTP sent successfully", "expires_in": otp_service.OTP_EXPIRY_SECONDS}


@router.post("/otp/verify")
def verify_otp(data: OTPVerifyRequest, db: Session = Depends(auth.get_db)):
    """Verify OTP and return JWT token (same as password login)."""
    mobile = data.mobile.strip()
    otp = data.otp.strip()

    if not mobile or not otp:
        raise HTTPException(status_code=400, detail="Mobile number and OTP are required")

    success, message = otp_service.verify_otp(mobile, otp)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    # OTP verified — find user and issue token
    user = db.query(models.User).filter(models.User.mobile == mobile).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access_token = auth.create_access_token({"sub": user.email, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}
