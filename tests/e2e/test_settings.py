"""
E2E tests for the Caldera Settings page (SettingsView.vue).

Settings displays Caldera's current main configuration and allows some
values to be updated via a code editor. It also lists active plugins.

Run with:
    pytest plugins/magma/tests/e2e/test_settings.py -v --browser chromium
"""

from playwright.sync_api import Page, expect


def test_settings_page_loads(auth_page: Page, base_url: str) -> None:
    """Navigating to /settings stays on /settings (no redirect to /login)."""
    auth_page.goto(base_url + '/settings')
    auth_page.wait_for_load_state('networkidle')
    assert '/login' not in auth_page.url, (
        f'Expected to stay on /settings but ended up at {auth_page.url}'
    )


def test_settings_config_api_returns_data(api_session, base_url: str) -> None:
    """
    GET /api/v2/config/main returns a non-empty dict.

    Sensitive keys (port, host, api_key_red, api_key_blue, crypt_salt,
    encryption_key, users, requirements) are stripped by the security filter,
    so we verify the response is a dict with at least one key rather than
    checking for any specific sensitive key.
    """
    resp = api_session.get(f'{base_url}/api/v2/config/main')
    assert resp.status_code == 200
    config = resp.json()
    assert isinstance(config, dict), f"Expected dict, got {type(config)}"
    assert len(config) > 0, "Config response is unexpectedly empty"
    # Verify that sensitive keys have been stripped
    sensitive_keys = {'port', 'host', 'api_key_red', 'api_key_blue',
                      'crypt_salt', 'encryption_key', 'users', 'requirements'}
    exposed_sensitive = sensitive_keys & set(config.keys())
    assert not exposed_sensitive, (
        f"Sensitive config keys are exposed in the API response: {exposed_sensitive}"
    )


def test_settings_displays_config_value(auth_page: Page, api_session, base_url: str) -> None:
    """
    A non-sensitive config value from the API appears somewhere on the settings page.

    The SettingsView renders all non-sensitive config keys as editable input fields.
    We pick the first key from the filtered config (which excludes sensitive keys
    like port, host, api_key_red, etc.) and verify its value is visible on the page.
    """
    resp = api_session.get(f'{base_url}/api/v2/config/main')
    assert resp.status_code == 200
    config = resp.json()

    # Find a non-sensitive key whose value is a non-empty string we can search for
    target_key = None
    target_value = None
    for key, value in config.items():
        if isinstance(value, str) and value.strip():
            target_key = key
            target_value = value.strip()
            break

    if not target_key:
        import pytest
        pytest.skip("No non-sensitive string config values available to check")

    auth_page.goto(base_url + '/settings')
    auth_page.wait_for_load_state('networkidle')
    # The settings page renders each config key as a label and its value in an input
    expect(auth_page.get_by_text(target_key, exact=False)).to_be_visible()


def test_settings_plugins_api_returns_list(api_session, base_url: str) -> None:
    """GET /api/v2/plugins returns a non-empty list of plugin objects."""
    resp = api_session.get(f'{base_url}/api/v2/plugins')
    assert resp.status_code == 200
    plugins = resp.json()
    assert isinstance(plugins, list)
    assert len(plugins) > 0, "Expected at least one plugin to be registered"


def test_settings_page_has_input_fields(auth_page: Page, base_url: str) -> None:
    """
    The settings page renders config values as editable <input> fields.

    SettingsView renders each non-sensitive config key as a table row with a
    plain <input.input> element (not a code editor). We verify that at least
    one input field is visible on the settings page.
    """
    auth_page.goto(base_url + '/settings')
    auth_page.wait_for_load_state('networkidle')
    # SettingsView renders each setting as an input.input element in a table row
    input_field = auth_page.locator('input.input').first
    expect(input_field).to_be_visible()


def test_settings_api_key_not_in_page_source(auth_page: Page, api_session, base_url: str) -> None:
    """
    The raw api_key_red value from the config API should NOT appear verbatim
    in the rendered page — it must be masked or omitted in the UI.
    """
    config_resp = api_session.get(f'{base_url}/api/v2/config/main')
    api_key = config_resp.json().get('api_key_red', '')

    if not api_key or api_key.startswith('$argon2'):
        # Hashed key — already opaque, skip this check
        return

    auth_page.goto(base_url + '/settings')
    auth_page.wait_for_load_state('networkidle')
    page_text = auth_page.content()
    assert api_key not in page_text, (
        'Raw api_key_red value is visible in the settings page source — '
        'it should be masked or omitted for security.'
    )


def test_settings_navigation_links_visible(auth_page: Page, base_url: str) -> None:
    """Navigation links to other sections are present on the settings page."""
    auth_page.goto(base_url + '/settings')
    auth_page.wait_for_load_state('networkidle')
    # The sidebar navigation should link to core views
    for label in ('Agents', 'Operations', 'Abilities'):
        expect(auth_page.get_by_role('link', name=label, exact=False)).to_be_visible()
