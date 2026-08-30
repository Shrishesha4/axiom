import httpx
from fastapi import HTTPException

from config import get_settings


async def verify_google_id_token(id_token: str) -> dict:
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(503, "Google sign-in is not configured")

    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
            timeout=10.0,
        )

    if res.status_code != 200:
        raise HTTPException(401, "Invalid Google token")

    payload = res.json()
    if payload.get("aud") != settings.google_client_id:
        raise HTTPException(401, "Invalid Google token")

    if str(payload.get("email_verified", "")).lower() != "true":
        raise HTTPException(401, "Google email is not verified")

    if not payload.get("sub") or not payload.get("email"):
        raise HTTPException(401, "Incomplete Google profile")

    return payload


async def exchange_google_code(code: str, redirect_uri: str) -> dict:
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(503, "Google sign-in is not configured")

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=10.0,
        )

    if res.status_code != 200:
        raise HTTPException(401, "Google sign-in failed")

    id_token = res.json().get("id_token")
    if not id_token:
        raise HTTPException(401, "Google sign-in failed")

    return await verify_google_id_token(id_token)
