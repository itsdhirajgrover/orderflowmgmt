import os
import requests
from dotenv import load_dotenv

load_dotenv()

OTP_API_KEY = os.getenv("OTP_API_KEY", "your_otp_service_api_key")
OTP_API_URL = os.getenv("OTP_API_URL", "https://api.example.com/send-otp")

class OTPService:
    @staticmethod
    def send_otp(mobile: str, otp: str) -> bool:
        payload = {
            "mobile": mobile,
            "otp": otp,
            "api_key": OTP_API_KEY
        }
        try:
            response = requests.post(OTP_API_URL, json=payload, timeout=10)
            return response.status_code == 200
        except Exception:
            return False

    @staticmethod
    def verify_otp(mobile: str, otp: str) -> bool:
        # Implement verification logic with provider if needed
        return True
