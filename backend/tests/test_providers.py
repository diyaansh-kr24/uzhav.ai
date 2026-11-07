"""Provider contract tests use stubs. They do not assert live account availability."""

import asyncio, json
import pytest
from app import providers


def test_deepseek_request_contract(monkeypatch):
    monkeypatch.setenv("AICREDITS_API_KEY", "test-key")
    monkeypatch.setenv("AICREDITS_BASE_URL", "https://api.aicredits.in/v1")
    monkeypatch.setenv("AICREDITS_MODEL", "deepseek/deepseek-v3.2")

    async def request(url, headers, **kw):
        assert url == "https://api.aicredits.in/v1/chat/completions"
        assert headers["Authorization"] == "Bearer test-key"
        assert kw["payload"]["model"] == "deepseek/deepseek-v3.2"
        assert kw["payload"]["response_format"] == {"type": "json_object"}
        return {
            "choices": [{"message": {"content": '```json\n{"supported":true}\n```'}}]
        }

    monkeypatch.setattr(providers, "request_json", request)
    assert asyncio.run(providers.completion("system", "user")) == {"supported": True}


@pytest.mark.parametrize("content", ["not-json", "[]", '"a string"'])
def test_malformed_generation_rejected(monkeypatch, content):
    monkeypatch.setenv("AICREDITS_API_KEY", "test-key")

    async def request(*a, **kw):
        return {"choices": [{"message": {"content": content}}]}

    monkeypatch.setattr(providers, "request_json", request)
    with pytest.raises(providers.ProviderError):
        asyncio.run(providers.completion("system", "user"))


def test_sarvam_translation_chunking_contract(monkeypatch):
    monkeypatch.setenv("SARVAM_API_KEY", "test-sarvam")
    calls = []

    async def request(url, headers, **kw):
        assert url == "https://api.sarvam.ai/translate"
        assert headers["api-subscription-key"] == "test-sarvam"
        payload = kw["payload"]
        calls.append(payload)
        assert len(payload["input"]) <= 1600
        assert (
            payload["source_language_code"] == "en-IN"
            and payload["target_language_code"] == "ta-IN"
        )
        return {"translated_text": "தமிழ்"}

    monkeypatch.setattr(providers, "request_json", request)
    assert asyncio.run(providers.translate("crop insurance " * 240, "en-IN", "ta-IN"))
    assert len(calls) > 1


def test_speech_content_type_contract(monkeypatch):
    monkeypatch.setenv("SARVAM_API_KEY", "test-sarvam")

    async def request(url, headers, **kw):
        assert url.endswith("/speech-to-text")
        assert kw["files"]["file"] == ("question.mp4", b"audio", "audio/mp4")
        assert kw["data"]["mode"] == "transcribe"
        return {"transcript": "என் பயிர்"}

    monkeypatch.setattr(providers, "request_json", request)
    assert asyncio.run(providers.transcribe(b"audio", "audio/mp4")) == "என் பயிர்"
