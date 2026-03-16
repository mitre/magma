"""Tests for app/magma_api.py — MagmaAPI and its endpoints."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from aiohttp import web
from aiohttp.test_utils import make_mocked_request

from app.magma_api import MagmaAPI


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_request(body: dict | list | str | None = None, method: str = "POST", path: str = "/"):
    """Build a lightweight mock request whose .read() returns *body* as JSON bytes."""
    req = AsyncMock(spec=web.Request)
    if body is not None:
        payload = json.dumps(body).encode() if not isinstance(body, (bytes, bytearray)) else body
    else:
        payload = b"{}"
    req.read = AsyncMock(return_value=payload)
    req.method = method
    req.path = path
    return req


# ---------------------------------------------------------------------------
# Construction
# ---------------------------------------------------------------------------

class TestMagmaAPIInit:

    def test_stores_services(self, mock_services):
        api = MagmaAPI(mock_services)
        assert api.services is mock_services

    def test_resolves_auth_svc(self, mock_services):
        api = MagmaAPI(mock_services)
        assert api.auth_svc is mock_services["auth_svc"]

    def test_resolves_data_svc(self, mock_services):
        api = MagmaAPI(mock_services)
        assert api.data_svc is mock_services["data_svc"]

    def test_auth_svc_none_when_missing(self):
        api = MagmaAPI({})
        assert api.auth_svc is None

    def test_data_svc_none_when_missing(self):
        api = MagmaAPI({})
        assert api.data_svc is None

    def test_services_dict_not_mutated(self, mock_services):
        original = dict(mock_services)
        MagmaAPI(mock_services)
        assert mock_services == original


# ---------------------------------------------------------------------------
# mirror() endpoint
# ---------------------------------------------------------------------------

class TestMirrorEndpoint:

    @pytest.mark.asyncio
    async def test_mirror_returns_json_response(self, magma_api):
        req = _make_request({"key": "value"})
        resp = await magma_api.mirror(req)
        assert isinstance(resp, web.Response)

    @pytest.mark.asyncio
    async def test_mirror_echoes_dict(self, magma_api):
        body = {"hello": "world"}
        resp = await magma_api.mirror(_make_request(body))
        assert json.loads(resp.body) == body

    @pytest.mark.asyncio
    async def test_mirror_echoes_list(self, magma_api):
        body = [1, 2, 3]
        resp = await magma_api.mirror(_make_request(body))
        assert json.loads(resp.body) == body

    @pytest.mark.asyncio
    async def test_mirror_echoes_nested(self, magma_api):
        body = {"a": {"b": [1, {"c": True}]}}
        resp = await magma_api.mirror(_make_request(body))
        assert json.loads(resp.body) == body

    @pytest.mark.asyncio
    async def test_mirror_echoes_empty_dict(self, magma_api):
        resp = await magma_api.mirror(_make_request({}))
        assert json.loads(resp.body) == {}

    @pytest.mark.asyncio
    async def test_mirror_echoes_empty_list(self, magma_api):
        resp = await magma_api.mirror(_make_request([]))
        assert json.loads(resp.body) == []

    @pytest.mark.asyncio
    async def test_mirror_echoes_string_body(self, magma_api):
        body = "just a string"
        resp = await magma_api.mirror(_make_request(body))
        assert json.loads(resp.body) == body

    @pytest.mark.asyncio
    async def test_mirror_echoes_number(self, magma_api):
        resp = await magma_api.mirror(_make_request(42))
        assert json.loads(resp.body) == 42

    @pytest.mark.asyncio
    async def test_mirror_echoes_boolean(self, magma_api):
        resp = await magma_api.mirror(_make_request(True))
        assert json.loads(resp.body) is True

    @pytest.mark.asyncio
    async def test_mirror_echoes_null(self, magma_api):
        resp = await magma_api.mirror(_make_request(None))
        # None body -> default "{}" -> echoes {}
        assert json.loads(resp.body) == {}

    @pytest.mark.asyncio
    async def test_mirror_content_type_json(self, magma_api):
        resp = await magma_api.mirror(_make_request({"x": 1}))
        assert resp.content_type == "application/json"

    @pytest.mark.asyncio
    async def test_mirror_reads_request_body(self, magma_api):
        req = _make_request({"a": 1})
        await magma_api.mirror(req)
        req.read.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_mirror_preserves_unicode(self, magma_api):
        body = {"emoji": "\u2728", "cjk": "\u4f60\u597d"}
        resp = await magma_api.mirror(_make_request(body))
        assert json.loads(resp.body) == body

    @pytest.mark.asyncio
    async def test_mirror_large_payload(self, magma_api):
        body = {"items": list(range(1000))}
        resp = await magma_api.mirror(_make_request(body))
        assert json.loads(resp.body) == body

    @pytest.mark.asyncio
    async def test_mirror_special_chars_in_keys(self, magma_api):
        body = {"key with spaces": 1, "key/with/slashes": 2, "": 3}
        resp = await magma_api.mirror(_make_request(body))
        assert json.loads(resp.body) == body

    @pytest.mark.asyncio
    async def test_mirror_invalid_json_raises(self, magma_api):
        req = AsyncMock()
        req.read = AsyncMock(return_value=b"not json")
        with pytest.raises(json.JSONDecodeError):
            await magma_api.mirror(req)

    @pytest.mark.asyncio
    async def test_mirror_empty_body_raises(self, magma_api):
        req = AsyncMock()
        req.read = AsyncMock(return_value=b"")
        with pytest.raises(json.JSONDecodeError):
            await magma_api.mirror(req)

    @pytest.mark.asyncio
    async def test_mirror_deeply_nested(self, magma_api):
        body = {"a": {"b": {"c": {"d": {"e": "deep"}}}}}
        resp = await magma_api.mirror(_make_request(body))
        assert json.loads(resp.body)["a"]["b"]["c"]["d"]["e"] == "deep"
