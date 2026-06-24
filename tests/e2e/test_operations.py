"""
Playwright E2E tests for the Caldera Operations UI view (/operations).

These tests verify the structure, visibility, and basic interactivity of
the Operations page in the Magma frontend (Vue 3 SPA). All tests are
independent and leave no permanent state — the operations list is observed
but never mutated.

Fixtures used (provided by conftest.py):
    caldera_server  (session) — base URL string
    api_session     (session) — authenticated requests.Session
    auth_page       (function) — Playwright page with auth cookies, not yet navigated
    base_url        (function) — base URL string
"""

import pytest
from playwright.sync_api import expect, Page


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def navigate_to_operations(page: Page, base_url: str) -> None:
    """Navigate to the /operations route and wait for network activity to settle."""
    page.goto(f"{base_url}/operations")
    page.wait_for_load_state("networkidle")


def get_operations_from_api(api_session, caldera_server: str) -> list:
    """Return the list of operation objects from the REST API."""
    resp = api_session.get(f"{caldera_server}/api/v2/operations")
    assert resp.status_code == 200, (
        f"GET /api/v2/operations returned HTTP {resp.status_code}"
    )
    return resp.json()


def get_operation_select(page: Page):
    """
    Return the <select> element used to choose an operation.

    OperationsView uses a native <select> (not a Bulma dropdown) to list
    available operations. The select element is inside the .column.is-4
    center column.
    """
    select_el = page.locator(".columns .column.is-4 select")
    expect(select_el.first).to_be_visible()
    return select_el.first


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_operations_page_heading(auth_page: Page, base_url: str) -> None:
    """
    The <h2> on the Operations page must contain the text "Operations".
    This confirms the correct view is rendered by the Vue router.
    """
    navigate_to_operations(auth_page, base_url)

    heading = auth_page.locator("h2")
    expect(heading).to_be_visible()
    expect(heading).to_contain_text("Operations")


def test_new_operation_button_visible(auth_page: Page, base_url: str) -> None:
    """
    The "New Operation" primary button must be present and visible in the
    toolbar area next to the operation selector.
    """
    navigate_to_operations(auth_page, base_url)

    new_op_btn = auth_page.get_by_role("button", name="New Operation")
    expect(new_op_btn).to_be_visible()


def test_operation_selector_dropdown_visible(auth_page: Page, base_url: str) -> None:
    """
    The operation selector must be present and visible.

    OperationsView uses a native <select> element (not a Bulma dropdown button)
    to list available operations. The placeholder <option> has the text
    "Select an operation" and value="".
    """
    navigate_to_operations(auth_page, base_url)

    # The selector is a <select> element in the center column
    select_el = auth_page.locator(".columns .column.is-4 select")
    expect(select_el.first).to_be_visible()

    # The placeholder option should be present
    placeholder = select_el.first.locator('option[value=""]')
    expect(placeholder).to_be_attached()


def test_new_operation_modal_opens(auth_page: Page, base_url: str) -> None:
    """
    Clicking "New Operation" should open a modal overlay that contains at
    minimum a text input field for the operation name.

    The Bulma modal becomes active by receiving the `is-active` class.
    """
    navigate_to_operations(auth_page, base_url)

    new_op_btn = auth_page.get_by_role("button", name="New Operation")
    expect(new_op_btn).to_be_visible()
    new_op_btn.click()

    # The Bulma modal gains `is-active` when opened
    modal = auth_page.locator(".modal.is-active")
    try:
        expect(modal).to_be_visible(timeout=5000)
    except Exception:
        # Fallback: accept any visible dialog/overlay containing an input
        modal = auth_page.locator("[class*='modal'], [role='dialog']")
        expect(modal).to_be_visible(timeout=3000)

    # The modal must contain at least one text input (operation name field)
    name_input = modal.locator("input[type='text'], input:not([type])")
    expect(name_input.first).to_be_visible()


def test_operations_api_count_matches_dropdown(
    auth_page: Page, base_url: str, api_session, caldera_server: str
) -> None:
    """
    The number of items shown in the operation selector <select> must equal
    the count returned by GET /api/v2/operations.

    Steps:
      1. Fetch operations from the API to get the expected count.
      2. Navigate to /operations.
      3. Count the <option> elements in the <select> (excluding the placeholder).
      4. Assert equality.
    """
    operations = get_operations_from_api(api_session, caldera_server)
    expected_count = len(operations)

    navigate_to_operations(auth_page, base_url)

    # OperationsView uses a native <select>; each operation is an <option>.
    # Exclude the placeholder option with value="".
    select_el = auth_page.locator(".columns .column.is-4 select")
    operation_options = select_el.first.locator('option:not([value=""])')
    actual_count = operation_options.count()

    assert actual_count == expected_count, (
        f"Selector shows {actual_count} operation(s) but API returned {expected_count}"
    )


def test_operation_names_in_dropdown(
    auth_page: Page, base_url: str, api_session, caldera_server: str
) -> None:
    """
    When at least one operation exists, the first operation's name returned by
    GET /api/v2/operations must appear as a selectable option in the <select>.

    OperationsView renders operation options as:
        "name - N decisions | date"
    so we check that an option containing the operation name is present.

    If no operations exist the test is skipped.
    """
    operations = get_operations_from_api(api_session, caldera_server)
    if not operations:
        pytest.skip("No operations registered — cannot verify selector names.")

    first_name = operations[0]["name"]

    navigate_to_operations(auth_page, base_url)

    # The operation's name should appear as an option in the <select>
    select_el = auth_page.locator(".columns .column.is-4 select")
    option = select_el.first.locator("option", has_text=first_name)
    expect(option.first).to_be_attached()


def test_delete_button_hidden_when_no_operation_selected(
    auth_page: Page, base_url: str
) -> None:
    """
    When no operation is selected, the "Delete" button must not be visible.

    In the template the Delete button uses `v-if="selectedOperation.id"` so it
    should be absent from the DOM (or hidden) when the selection is empty.
    """
    navigate_to_operations(auth_page, base_url)

    # The Delete button must not be visible when nothing is selected.
    # Using to_not_be_visible covers both the v-if removal from DOM and a
    # CSS display:none scenario.
    delete_btn = auth_page.get_by_role("button", name="Delete")
    expect(delete_btn).not_to_be_visible()


def test_download_report_hidden_when_no_operation_selected(
    auth_page: Page, base_url: str
) -> None:
    """
    When no operation is selected, the "Download Report" button must not be
    visible.

    In the template the button uses `v-if="selectedOperation.id"` so it
    should be absent from the DOM (or hidden) when the selection is empty.
    """
    navigate_to_operations(auth_page, base_url)

    # The Download Report button must not be visible when nothing is selected.
    download_btn = auth_page.get_by_role("button", name="Download Report")
    expect(download_btn).not_to_be_visible()
