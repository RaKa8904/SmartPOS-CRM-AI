import os
import json
from urllib import request, error
from dotenv import load_dotenv

load_dotenv()

SMS_PROVIDER_URL = os.getenv("SMS_PROVIDER_URL")
SMS_API_KEY = os.getenv("SMS_API_KEY")
SMS_SENDER_ID = os.getenv("SMS_SENDER_ID", "SmartPOS")


def send_sms(phone: str, message: str) -> str:
    """
    Sends SMS via a configurable provider endpoint.
    Expected JSON request body:
    {
        "api_key": "...",
        "to": "...",
        "message": "...",
        "sender_id": "..."
    }
    Returns provider response body as message id fallback.
    """
    if not SMS_PROVIDER_URL or not SMS_API_KEY:
        raise RuntimeError("SMS provider configuration not set in .env")

    payload = {
        "api_key": SMS_API_KEY,
        "to": phone,
        "message": message,
        "sender_id": SMS_SENDER_ID,
    }

    data = json.dumps(payload).encode("utf-8")
    req = request.Request(
        SMS_PROVIDER_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=15) as resp:
            return resp.read().decode("utf-8")[:255]
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8") if exc.fp else str(exc)
        raise RuntimeError(f"SMS provider HTTP error: {details}") from exc
    except Exception as exc:
        raise RuntimeError(f"SMS provider error: {exc}") from exc
