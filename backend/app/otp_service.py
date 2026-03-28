import os
import random
import datetime
import hashlib
import hmac
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS", "300"))  # 5 minutes
OTP_SECRET = os.getenv("JWT_SECRET", "your_jwt_secret_key")

# In-memory store: mobile -> {otp_hash, expires_at, attempts}
# For production, replace with Redis or DB table
_otp_store: dict = {}


def _hash_otp(otp: str) -> str:
    """Hash OTP so plain text is never stored."""
    return hmac.new(OTP_SECRET.encode(), otp.encode(), hashlib.sha256).hexdigest()


def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    return str(random.randint(100000, 999999))


def store_otp(mobile: str, otp: str) -> None:
    """Store hashed OTP with expiry and reset attempt counter."""
    _otp_store[mobile] = {
        "otp_hash": _hash_otp(otp),
        "expires_at": datetime.datetime.utcnow() + datetime.timedelta(seconds=OTP_EXPIRY_SECONDS),
        "attempts": 0,
    }


def verify_otp(mobile: str, otp: str) -> tuple[bool, str]:
    """Verify OTP. Returns (success, message)."""
    record = _otp_store.get(mobile)
    if not record:
        return False, "No OTP requested for this number. Please request a new OTP."

    if record["attempts"] >= 5:
        del _otp_store[mobile]
        return False, "Too many failed attempts. Please request a new OTP."

    if datetime.datetime.utcnow() > record["expires_at"]:
        del _otp_store[mobile]
        return False, "OTP has expired. Please request a new OTP."

    record["attempts"] += 1

    if hmac.compare_digest(_hash_otp(otp), record["otp_hash"]):
        del _otp_store[mobile]  # One-time use
        return True, "OTP verified"

    return False, f"Invalid OTP. {5 - record['attempts']} attempts remaining."


def send_otp_sms(mobile: str, otp: str) -> bool:
    """
    Send OTP via SMS.
    Currently logs the OTP for demo/development.
    Replace this with your SMS provider (e.g., Twilio, MSG91, AWS SNS).
    """
    # --- DEMO MODE: Log OTP instead of sending SMS ---
    logger.warning(f"[DEMO OTP] Mobile: {mobile} → OTP: {otp}")
    print(f"\n{'='*50}")
    print(f"  📱 OTP for {mobile}: {otp}")
    print(f"  ⏱  Valid for {OTP_EXPIRY_SECONDS // 60} minutes")
    print(f"{'='*50}\n")
    return True

    # --- PRODUCTION: Uncomment and configure one of these ---

    # # Option 1: MSG91 (India)
    # import requests
    # MSG91_AUTH_KEY = os.getenv("MSG91_AUTH_KEY")
    # MSG91_TEMPLATE_ID = os.getenv("MSG91_TEMPLATE_ID")
    # try:
    #     resp = requests.post(
    #         "https://control.msg91.com/api/v5/otp",
    #         json={"mobile": mobile, "otp": otp, "template_id": MSG91_TEMPLATE_ID},
    #         headers={"authkey": MSG91_AUTH_KEY},
    #         timeout=10,
    #     )
    #     return resp.status_code == 200
    # except Exception as e:
    #     logger.error(f"MSG91 SMS failed: {e}")
    #     return False

    # # Option 2: Twilio
    # from twilio.rest import Client
    # TWILIO_SID = os.getenv("TWILIO_SID")
    # TWILIO_TOKEN = os.getenv("TWILIO_TOKEN")
    # TWILIO_FROM = os.getenv("TWILIO_FROM")
    # try:
    #     client = Client(TWILIO_SID, TWILIO_TOKEN)
    #     client.messages.create(
    #         body=f"Your OrderFlow login OTP is: {otp}. Valid for {OTP_EXPIRY_SECONDS // 60} min.",
    #         from_=TWILIO_FROM,
    #         to=mobile,
    #     )
    #     return True
    # except Exception as e:
    #     logger.error(f"Twilio SMS failed: {e}")
    #     return False
