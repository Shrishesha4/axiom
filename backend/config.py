import os
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://axiom:axiom@localhost:5432/axiom_db"
    openrouter_api_key: str = ""
    openrouter_model: str = "deepseek/deepseek-v4-flash"
    openrouter_web_search_enabled: bool = False
    openrouter_web_search_max_results: int = 5
    openrouter_web_search_engine: str = ""
    openrouter_web_search_mode: str = ""
    openrouter_web_search_context_size: str = ""
    openfda_api_key: str = ""
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 72
    admin_email: str = "admin@axiom.com"
    admin_password: str = "admin123"
    admin_name: str = "Admin"
    default_user_token_limit: int = 100_000
    google_client_id: str = ""
    google_client_secret: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
