import os
import json
import base64
from datetime import datetime
from urllib import request, error
from dotenv import load_dotenv

load_dotenv()

SMS_PROVIDER = os.getenv("SMS_PROVIDER", "mock").strip().lower()

# Generic provider settings
SMS_PROVIDER_URL = os.getenv("SMS_PROVIDER_URL")
SMS_API_KEY = os.getenv("SMS_API_KEY")
SMS_SENDER_ID = os.getenv("SMS_SENDER_ID", "SmartPOS")

# Twilio settings
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER")


def _send_via_mock(phone: str, message: str) -> str:
    """Simulate SMS send in local/dev without external provider."""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    preview = message.replace("\n", " ")[:120]
    print(
        f"[MOCK_SMS] to={phone} sender={SMS_SENDER_ID} preview='{preview}'"
    )
    return f"mock-sms-{timestamp}"


def _send_via_generic(phone: str, message: str) -> str:
    if not SMS_PROVIDER_URL or not SMS_API_KEY:
        raise RuntimeError(
            "SMS provider configuration not set in .env. "
            "Set SMS_PROVIDER_URL and SMS_API_KEY (or use SMS_PROVIDER=twilio)."
        )

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


def _send_via_twilio(phone: str, message: str) -> str:
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_FROM_NUMBER:
        raise RuntimeError(
            "Twilio configuration missing in .env. "
            "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER."
        )

    twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    form = f"To={phone}&From={TWILIO_FROM_NUMBER}&Body={message}"
    data = form.encode("utf-8")

    basic_token = base64.b64encode(
        f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode("utf-8")
    ).decode("utf-8")

    req = request.Request(
        twilio_url,
        data=data,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Basic {basic_token}",
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
            try:
                parsed = json.loads(body)
                # Twilio SID is a stable provider reference.
                return str(parsed.get("sid", ""))[:255] or body[:255]
            except Exception:
                return body[:255]
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8") if exc.fp else str(exc)
        raise RuntimeError(f"Twilio HTTP error: {details}") from exc
    except Exception as exc:
        raise RuntimeError(f"Twilio provider error: {exc}") from exc


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
    if SMS_PROVIDER == "mock":
        return _send_via_mock(phone, message)

    if SMS_PROVIDER == "twilio":
        return _send_via_twilio(phone, message)

    return _send_via_generic(phone, message)
