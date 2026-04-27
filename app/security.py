from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

from cryptography.fernet import Fernet, InvalidToken, MultiFernet


ROOT_DIR = Path(__file__).resolve().parent.parent
SECRET_FILE = ROOT_DIR / ".ats-secrets.json"
_USERNAME_RE = re.compile(r"^[A-Za-z0-9_.@-]{3,64}$")
_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_SCRYPT_DKLEN = 64


@dataclass(frozen=True)
class SecuritySettings:
    env: str
    session_secret: str
    encryption_keys: tuple[str, ...]
    secure_cookies: bool
    force_https: bool
    allowed_hosts: tuple[str, ...]
    session_cookie_name: str = "ats_session"
    session_max_age_seconds: int = 60 * 60 * 12
    password_min_length: int = 12


def _env_bool(name: str, *, default: bool) -> bool:
    raw = (os.getenv(name) or "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _normalize_allowed_hosts(raw: str) -> tuple[str, ...]:
    values = tuple(part.strip() for part in raw.split(",") if part.strip())
    return values or ("*",)


def _load_or_create_local_secrets() -> dict[str, object]:
    data: dict[str, object] = {}
    if SECRET_FILE.exists():
        try:
            loaded = json.loads(SECRET_FILE.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                data = loaded
        except (OSError, json.JSONDecodeError):
            data = {}

    changed = False
    session_secret = data.get("session_secret")
    if not isinstance(session_secret, str) or not session_secret.strip():
        data["session_secret"] = secrets.token_urlsafe(32)
        changed = True

    keys = data.get("encryption_keys")
    if not isinstance(keys, list) or not keys or not all(isinstance(item, str) and item.strip() for item in keys):
        data["encryption_keys"] = [Fernet.generate_key().decode("ascii")]
        changed = True

    if changed:
        SECRET_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")

    return data


@lru_cache(maxsize=1)
def get_security_settings() -> SecuritySettings:
    env = (os.getenv("ATS_ENV") or "development").strip().lower() or "development"
    local = _load_or_create_local_secrets()

    session_secret = (os.getenv("ATS_SESSION_SECRET") or str(local.get("session_secret") or "")).strip()
    raw_keys = (os.getenv("ATS_ENCRYPTION_KEYS") or os.getenv("ATS_ENCRYPTION_KEY") or "").strip()
    if raw_keys:
        encryption_keys = tuple(part.strip() for part in raw_keys.split(",") if part.strip())
    else:
        encryption_keys = tuple(str(item).strip() for item in list(local.get("encryption_keys") or []) if str(item).strip())

    allowed_hosts_raw = (os.getenv("ATS_ALLOWED_HOSTS") or "").strip()
    if env == "production" and not allowed_hosts_raw:
        raise RuntimeError("ATS_ALLOWED_HOSTS must be set when ATS_ENV=production.")
    allowed_hosts = _normalize_allowed_hosts(allowed_hosts_raw or "*")

    return SecuritySettings(
        env=env,
        session_secret=session_secret,
        encryption_keys=encryption_keys,
        secure_cookies=_env_bool("ATS_SECURE_COOKIES", default=env == "production"),
        force_https=_env_bool("ATS_FORCE_HTTPS", default=env == "production"),
        allowed_hosts=allowed_hosts,
    )


@lru_cache(maxsize=1)
def get_fernet() -> MultiFernet:
    settings = get_security_settings()
    fernets = [Fernet(key.encode("ascii")) for key in settings.encryption_keys]
    return MultiFernet(fernets)


def encrypt_text(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    return get_fernet().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_text(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return get_fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return None


def normalize_username(raw: str) -> str:
    username = (raw or "").strip().lower()
    if not _USERNAME_RE.fullmatch(username):
        raise ValueError("Username must be 3-64 characters using letters, numbers, dots, underscores, @, or dashes.")
    return username


def validate_new_password(password: str, confirm_password: str) -> str:
    if password != confirm_password:
        raise ValueError("Passwords do not match.")
    if len(password) < get_security_settings().password_min_length:
        raise ValueError(
            f"Password must be at least {get_security_settings().password_min_length} characters."
        )
    if len(password) > 256:
        raise ValueError("Password is too long.")
    return password


def _b64e(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii")


def _b64d(value: str) -> bytes:
    return base64.urlsafe_b64decode(value.encode("ascii"))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_SCRYPT_DKLEN,
    )
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${_b64e(salt)}${_b64e(digest)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        scheme, n_raw, r_raw, p_raw, salt_raw, digest_raw = stored_hash.split("$", 5)
        if scheme != "scrypt":
            return False
        digest = hashlib.scrypt(
            password.encode("utf-8"),
            salt=_b64d(salt_raw),
            n=int(n_raw),
            r=int(r_raw),
            p=int(p_raw),
            dklen=len(_b64d(digest_raw)),
        )
        return hmac.compare_digest(digest, _b64d(digest_raw))
    except (ValueError, TypeError):
        return False


def safe_next_path(raw: str | None, *, default: str = "/") -> str:
    target = (raw or "").strip()
    if not target:
        return default
    parts = urlsplit(target)
    if parts.scheme or parts.netloc:
        return default
    if not target.startswith("/") or target.startswith("//"):
        return default
    return target
