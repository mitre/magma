"""Tests for app/magma_svc.py — MagmaService."""

import logging
from unittest.mock import MagicMock

import pytest

from app.magma_svc import MagmaService


# ---------------------------------------------------------------------------
# Construction / initialisation
# ---------------------------------------------------------------------------

class TestMagmaServiceInit:

    def test_stores_services_dict(self, mock_services):
        svc = MagmaService(mock_services)
        assert svc.services is mock_services

    def test_resolves_file_svc(self, mock_services):
        svc = MagmaService(mock_services)
        assert svc.file_svc is mock_services["file_svc"]

    def test_file_svc_none_when_missing(self):
        svc = MagmaService({})
        assert svc.file_svc is None

    def test_creates_logger(self, mock_services):
        svc = MagmaService(mock_services)
        assert isinstance(svc.log, logging.Logger)

    def test_logger_name(self, mock_services):
        svc = MagmaService(mock_services)
        assert svc.log.name == "magma_svc"

    def test_services_dict_not_mutated(self, mock_services):
        original_keys = set(mock_services.keys())
        MagmaService(mock_services)
        assert set(mock_services.keys()) == original_keys


# ---------------------------------------------------------------------------
# foo()
# ---------------------------------------------------------------------------

class TestFoo:

    @pytest.mark.asyncio
    async def test_foo_returns_bar(self, magma_svc):
        result = await magma_svc.foo()
        assert result == "bar"

    @pytest.mark.asyncio
    async def test_foo_returns_string(self, magma_svc):
        result = await magma_svc.foo()
        assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_foo_idempotent(self, magma_svc):
        r1 = await magma_svc.foo()
        r2 = await magma_svc.foo()
        assert r1 == r2

    @pytest.mark.asyncio
    async def test_foo_does_not_use_file_svc(self, magma_svc):
        """foo() should not touch file_svc."""
        await magma_svc.foo()
        magma_svc.file_svc.assert_not_called()


# ---------------------------------------------------------------------------
# Service wiring edge-cases
# ---------------------------------------------------------------------------

class TestServiceWiring:

    def test_extra_services_ignored(self):
        services = {"file_svc": MagicMock(), "extra": MagicMock()}
        svc = MagmaService(services)
        assert svc.file_svc is services["file_svc"]

    def test_empty_services(self):
        svc = MagmaService({})
        assert svc.services == {}
        assert svc.file_svc is None

    def test_services_with_none_values(self):
        svc = MagmaService({"file_svc": None})
        assert svc.file_svc is None

    def test_multiple_instances_independent(self, mock_services):
        svc_a = MagmaService(mock_services)
        svc_b = MagmaService(mock_services)
        assert svc_a is not svc_b
        assert svc_a.log is not svc_b.log or svc_a.log.name == svc_b.log.name
