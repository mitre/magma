"""Shared fixtures for magma pytest suite."""

import os
import sys
import types
import logging
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio

# ---------------------------------------------------------------------------
# Ensure the project root is on sys.path
# ---------------------------------------------------------------------------
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# ---------------------------------------------------------------------------
# Stub out the Caldera-core imports that magma relies on at import time so
# the test suite can run without a full Caldera installation.
#
# magma's app/ directory is NOT a standalone package — in Caldera, "app" is
# the core framework package.  magma_api.py does `from app.service.auth_svc
# import …` expecting Caldera's auth_svc.  We create a synthetic "app"
# package whose __path__ includes the real app/ dir so that magma_api and
# magma_svc can be imported, while also providing stubs for the Caldera-core
# sub-modules they reference.
# ---------------------------------------------------------------------------

def _install_caldera_stubs():
    """Create minimal stand-ins for caldera packages that magma imports."""

    app_dir = os.path.join(PROJECT_ROOT, "app")

    # --- top-level "app" package with __path__ pointing at real dir --------
    app_pkg = types.ModuleType("app")
    app_pkg.__path__ = [app_dir]
    app_pkg.__package__ = "app"

    # --- app.utility.base_world -------------------------------------------
    app_utility = types.ModuleType("app.utility")
    app_utility.__path__ = []
    app_utility.__package__ = "app.utility"

    base_world_mod = types.ModuleType("app.utility.base_world")

    class _Access:
        APP = "app"
        RED = "red"
        BLUE = "blue"

    class BaseWorld:
        Access = _Access

    base_world_mod.BaseWorld = BaseWorld

    # --- app.service.auth_svc ---------------------------------------------
    app_service = types.ModuleType("app.service")
    app_service.__path__ = []
    app_service.__package__ = "app.service"

    auth_svc_mod = types.ModuleType("app.service.auth_svc")

    def check_authorization(func):
        return func

    def for_all_public_methods(decorator):
        def wrapper(cls):
            return cls
        return wrapper

    auth_svc_mod.check_authorization = check_authorization
    auth_svc_mod.for_all_public_methods = for_all_public_methods

    # --- register them in sys.modules so later imports resolve ------------
    mods = {
        "app": app_pkg,
        "app.utility": app_utility,
        "app.utility.base_world": base_world_mod,
        "app.service": app_service,
        "app.service.auth_svc": auth_svc_mod,
    }
    for name, mod in mods.items():
        sys.modules[name] = mod


_install_caldera_stubs()

# We also need `plugins.magma` to resolve for hook.py's relative import.
_plugins = types.ModuleType("plugins")
_plugins.__path__ = []
_plugins_magma = types.ModuleType("plugins.magma")
_plugins_magma.__path__ = [PROJECT_ROOT]
_plugins_magma_app = types.ModuleType("plugins.magma.app")
_plugins_magma_app.__path__ = [os.path.join(PROJECT_ROOT, "app")]

sys.modules["plugins"] = _plugins
sys.modules["plugins.magma"] = _plugins_magma
sys.modules["plugins.magma.app"] = _plugins_magma_app

# Now import the actual modules under test — the stubs make this safe.
from app.magma_api import MagmaAPI  # noqa: E402
from app.magma_svc import MagmaService  # noqa: E402

# Patch plugins.magma.app.magma_api so hook.py's import succeeds
_pm_api = types.ModuleType("plugins.magma.app.magma_api")
_pm_api.MagmaAPI = MagmaAPI
_plugins_magma_app.magma_api = _pm_api
sys.modules["plugins.magma.app.magma_api"] = _pm_api


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_services():
    """Return a dict of mock Caldera core services."""
    return {
        "auth_svc": MagicMock(name="auth_svc"),
        "data_svc": MagicMock(name="data_svc"),
        "file_svc": MagicMock(name="file_svc"),
        "app_svc": MagicMock(name="app_svc"),
    }


@pytest.fixture
def magma_api(mock_services):
    return MagmaAPI(mock_services)


@pytest.fixture
def magma_svc(mock_services):
    return MagmaService(mock_services)


@pytest.fixture
def mock_app(mock_services):
    """Fake aiohttp application (a plain dict is sufficient for router ops)."""
    app = MagicMock()
    app.router = MagicMock()
    mock_services["app_svc"].application = app
    return app
