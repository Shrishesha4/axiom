from typing import Any

from openai import OpenAI

from config import get_settings

settings = get_settings()


def get_openrouter_client() -> OpenAI:
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.openrouter_api_key,
    )


def _web_plugin_config() -> dict[str, Any]:
    plugin: dict[str, Any] = {"id": "web"}

    if settings.openrouter_web_search_max_results:
        plugin["max_results"] = settings.openrouter_web_search_max_results
    if settings.openrouter_web_search_engine:
        plugin["engine"] = settings.openrouter_web_search_engine
    if settings.openrouter_web_search_mode:
        plugin["mode"] = settings.openrouter_web_search_mode

    return plugin


def openrouter_request_extras() -> dict[str, Any]:
    """OpenRouter-specific request fields (web search plugin, native search options)."""
    if not settings.openrouter_web_search_enabled:
        return {}

    extra_body: dict[str, Any] = {"plugins": [_web_plugin_config()]}

    if settings.openrouter_web_search_context_size:
        extra_body["web_search_options"] = {
            "search_context_size": settings.openrouter_web_search_context_size,
        }

    return {"extra_body": extra_body}
