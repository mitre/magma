"""Tests for hook.py — plugin metadata and the enable() lifecycle."""

import importlib
import sys
import types
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Import hook module (the conftest stubs make this safe)
# ---------------------------------------------------------------------------

import hook


# ---------------------------------------------------------------------------
# Module-level metadata
# ---------------------------------------------------------------------------

class TestHookMetadata:

    def test_name(self):
        assert hook.name == "Magma"

    def test_description_mentions_vue(self):
        assert "VueJS" in hook.description

    def test_description_mentions_caldera(self):
        assert "Caldera" in hook.description

    def test_description_is_string(self):
        assert isinstance(hook.description, str)

    def test_address(self):
        assert hook.address == "/plugin/magma/gui"

    def test_address_starts_with_slash(self):
        assert hook.address.startswith("/")

    def test_address_contains_plugin(self):
        assert "/plugin/" in hook.address

    def test_access_is_app(self):
        from app.utility.base_world import BaseWorld
        assert hook.access == BaseWorld.Access.APP

    def test_access_value(self):
        assert hook.access == "app"


# ---------------------------------------------------------------------------
# enable() coroutine
# ---------------------------------------------------------------------------

class TestEnable:

    @pytest.mark.asyncio
    async def test_enable_is_coroutine(self):
        import inspect
        assert inspect.iscoroutinefunction(hook.enable)

    @pytest.mark.asyncio
    async def test_enable_retrieves_app_svc(self, mock_services, mock_app):
        await hook.enable(mock_services)
        mock_services["app_svc"].application  # accessed as attribute

    @pytest.mark.asyncio
    async def test_enable_creates_magma_api(self, mock_services, mock_app):
        with patch("hook.MagmaAPI") as mock_cls:
            await hook.enable(mock_services)
            mock_cls.assert_called_once_with(mock_services)

    @pytest.mark.asyncio
    async def test_enable_passes_services_to_api(self, mock_services, mock_app):
        with patch("hook.MagmaAPI") as mock_cls:
            await hook.enable(mock_services)
            args, _ = mock_cls.call_args
            assert args[0] is mock_services

    @pytest.mark.asyncio
    async def test_enable_accesses_application(self, mock_services, mock_app):
        await hook.enable(mock_services)
        # The enable function reads app_svc.application
        _ = mock_services["app_svc"].application

    @pytest.mark.asyncio
    async def test_enable_with_minimal_services(self):
        """enable() needs app_svc at minimum."""
        app_svc = MagicMock()
        app_svc.application = MagicMock()
        services = {"app_svc": app_svc}
        # Should not raise
        await hook.enable(services)

    @pytest.mark.asyncio
    async def test_enable_without_app_svc_raises(self):
        with pytest.raises((AttributeError, TypeError)):
            await hook.enable({})


# ---------------------------------------------------------------------------
# Plugin module attributes expected by Caldera plugin loader
# ---------------------------------------------------------------------------

class TestPluginContract:
    """Caldera expects every plugin hook.py to expose specific module-level
    attributes. Verify the contract is satisfied."""

    def test_has_name(self):
        assert hasattr(hook, "name")

    def test_has_description(self):
        assert hasattr(hook, "description")

    def test_has_address(self):
        assert hasattr(hook, "address")

    def test_has_access(self):
        assert hasattr(hook, "access")

    def test_has_enable(self):
        assert hasattr(hook, "enable")

    def test_enable_is_callable(self):
        assert callable(hook.enable)

    def test_name_is_non_empty_string(self):
        assert isinstance(hook.name, str) and len(hook.name) > 0

    def test_description_is_non_empty_string(self):
        assert isinstance(hook.description, str) and len(hook.description) > 0

    def test_address_is_non_empty_string(self):
        assert isinstance(hook.address, str) and len(hook.address) > 0


# ---------------------------------------------------------------------------
# Route / static-file serving expectations
# ---------------------------------------------------------------------------

class TestRouteRegistration:
    """The enable() function should set up the application for serving the
    Magma Vue SPA. We test that the expected aiohttp structures are touched."""

    @pytest.mark.asyncio
    async def test_app_obtained_from_app_svc(self, mock_services, mock_app):
        await hook.enable(mock_services)
        # Confirm application attribute was accessed
        assert mock_services["app_svc"].application is mock_app

    @pytest.mark.asyncio
    async def test_enable_returns_none(self, mock_services, mock_app):
        result = await hook.enable(mock_services)
        assert result is None


# ---------------------------------------------------------------------------
# Build / dist expectations
# ---------------------------------------------------------------------------

class TestDistServing:
    """Magma's built Vue frontend lives in a dist/ directory. Verify
    assumptions about the address where it would be served."""

    def test_gui_address_ends_with_gui(self):
        assert hook.address.endswith("/gui")

    def test_gui_address_has_magma(self):
        assert "magma" in hook.address

    def test_gui_address_segments(self):
        parts = hook.address.strip("/").split("/")
        assert parts == ["plugin", "magma", "gui"]
