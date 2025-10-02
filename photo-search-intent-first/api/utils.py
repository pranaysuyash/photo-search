from typing import Any, Callable, Dict, Iterable, List, Optional, TypeVar


def _from_body(
    body: Optional[Dict[str, Any]],
    current: Optional[Any],
    key: str,
    *,
    default: Optional[Any] = None,
    cast=None,
):
    if current is not None:
        return current
    if body is not None and key in body:
        value = body[key]
        if value is None:
            return default
        if cast is not None:
            try:
                return cast(value)
            except Exception:
                return default
        return value
    return default


def _require(value: Optional[Any], name: str) -> Any:
    if value is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail=f"Missing required field: {name}")
    return value


def _as_bool(v: Any) -> bool:
    try:
        if isinstance(v, bool):
            return v
        return str(v).strip().lower() in {"1", "true", "yes", "y"}
    except Exception:
        return False


def _as_str_list(v: Any) -> List[str]:
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x) for x in v]
    return [str(v)]




def _emb(provider: str, hf_token: Optional[str], openai_key: Optional[str], st_model: Optional[str] = None,
         tf_model: Optional[str] = None, hf_model: Optional[str] = None):
    # Lazy import to avoid loading heavy ML libraries at module import time
    from adapters.provider_factory import get_provider
    return get_provider(provider, hf_token=hf_token, openai_api_key=openai_key, st_model=st_model, tf_model=tf_model, hf_model=hf_model)


T = TypeVar("T")
def _zip_meta(
    meta: Dict[str, Iterable[Any]],
    key: str,
    transform: Callable[[Any], T],
) -> Dict[str, T]:
    """Map values from the EXIF metadata index onto their paths with a transform."""
    
    paths = meta.get("paths") or []
    values = meta.get(key) or []
    result: Dict[str, T] = {}
    for path, raw in zip(paths, values):
        result[str(path)] = transform(raw)
    return result