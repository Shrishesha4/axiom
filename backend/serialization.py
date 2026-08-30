from datetime import datetime


def serialize_utc(dt: datetime) -> str:
    """Serialize a naive UTC datetime for JSON (always includes Z suffix)."""
    iso = dt.isoformat()
    if iso.endswith("Z") or "+" in iso[-7:] or (len(iso) >= 6 and iso[-6] in "+-"):
        return iso
    return f"{iso}Z"
