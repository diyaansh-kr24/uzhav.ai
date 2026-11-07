import asyncio, json, re
import httpx
from .config import setting, configured


class ProviderError(Exception):
    pass


async def request_json(url, headers, *, payload=None, files=None, data=None):
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=65) as client:
                r = await client.post(
                    url, headers=headers, json=payload, files=files, data=data
                )
            if r.status_code in (429, 500, 502, 503, 504) and attempt < 2:
                await asyncio.sleep(0.6 * (attempt + 1))
                continue
            r.raise_for_status()
            result = r.json()
            if not isinstance(result, dict):
                raise ValueError("Expected a JSON object")
            return result
        except (httpx.HTTPError, ValueError) as exc:
            # Deliberately do not expose upstream error bodies or credentials.
            raise ProviderError(
                "Provider request failed; retry or request review."
            ) from exc
    raise ProviderError("Provider temporarily unavailable.")


async def completion(system, user):
    if not configured("AICREDITS_API_KEY"):
        raise ProviderError("DeepSeek is not configured.")
    result = await request_json(
        setting("AICREDITS_BASE_URL", "https://api.aicredits.in/v1").rstrip("/")
        + "/chat/completions",
        {"Authorization": "Bearer " + setting("AICREDITS_API_KEY")},
        payload={
            "model": setting("AICREDITS_MODEL", "deepseek/deepseek-v3.2"),
            "temperature": 0.1,
            "max_tokens": 2400,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "response_format": {"type": "json_object"},
        },
    )
    try:
        text = result["choices"][0]["message"]["content"]
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
        parsed = json.loads(text)
        if not isinstance(parsed, dict):
            raise ValueError("Expected a structured object")
        return parsed
    except (KeyError, TypeError, ValueError, IndexError) as exc:
        raise ProviderError("Invalid structured model response.") from exc


async def translate(text, source, target):
    if source == target:
        return text
    if not configured("SARVAM_API_KEY"):
        raise ProviderError("Sarvam translation is not configured.")
    # Split at sentence/word boundaries below the documented 2000-character limit.
    pieces = []
    while text:
        end = min(1600, len(text))
        if end < len(text):
            boundary = text.rfind(" ", 0, end)
            if boundary > 800:
                end = boundary
        pieces.append(text[:end])
        text = text[end:].lstrip()
    output = []
    for part in pieces:
        r = await request_json(
            "https://api.sarvam.ai/translate",
            {"api-subscription-key": setting("SARVAM_API_KEY")},
            payload={
                "input": part,
                "source_language_code": source,
                "target_language_code": target,
                "model": setting("SARVAM_TRANSLATE_MODEL", "sarvam-translate:v1"),
                "mode": "formal",
                "numerals_format": "international",
            },
        )
        if not isinstance(r.get("translated_text"), str):
            raise ProviderError("Invalid translation response.")
        output.append(r["translated_text"])
    return " ".join(output)


async def transcribe(audio, content_type):
    if not configured("SARVAM_API_KEY"):
        raise ProviderError("Sarvam speech is not configured.")
    r = await request_json(
        "https://api.sarvam.ai/speech-to-text",
        {"api-subscription-key": setting("SARVAM_API_KEY")},
        files={
            "file": (
                "question."
                + {
                    "audio/webm": "webm",
                    "audio/mp4": "mp4",
                    "audio/wav": "wav",
                    "audio/ogg": "ogg",
                }.get(content_type, "webm"),
                audio,
                content_type,
            )
        },
        data={
            "model": setting("SARVAM_STT_MODEL", "saaras:v3"),
            "language_code": "unknown",
            "mode": "transcribe",
        },
    )
    if not isinstance(r.get("transcript"), str):
        raise ProviderError("Invalid speech response.")
    return r["transcript"]


async def embeddings(texts):
    r = await request_json(
        setting("AICREDITS_BASE_URL", "https://api.aicredits.in/v1").rstrip("/")
        + "/embeddings",
        {"Authorization": "Bearer " + setting("AICREDITS_API_KEY")},
        payload={"model": setting("EMBEDDING_MODEL"), "input": texts},
    )
    try:
        return [x["embedding"] for x in sorted(r["data"], key=lambda x: x["index"])]
    except (KeyError, TypeError):
        raise ProviderError("Invalid embedding response.")
