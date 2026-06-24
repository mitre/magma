"""
Playwright E2E tests for the Caldera Objectives UI view (/objectives).

These tests verify the page structure, dropdown selector, detail panel,
API/UI consistency, and the create-objective flow for the ObjectivesView
component.  Any objectives created during tests are deleted via the API in
cleanup to keep the instance state clean.

Fixtures used (provided by conftest.py):
    caldera_server  (session) — base URL string
    api_session     (session) — authenticated requests.Session
    auth_page       (function) — Playwright page with auth cookies, not yet navigated
    base_url        (function) — base URL string

Run with:
    pytest plugins/magma/tests/e2e/test_objectives.py -v --browser chromium
"""

import pytest
from playwright.sync_api import expect, Page


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def navigate_to_objectives(page: Page, base_url: str) -> None:
    """Navigate to the /objectives route and wait for network activity to settle."""
    page.goto(f"{base_url}/objectives")
    page.wait_for_load_state("networkidle")


def get_objectives_from_api(api_session, caldera_server: str) -> list:
    """Return the list of objective objects from the REST API."""
    resp = api_session.get(f"{caldera_server}/api/v2/objectives")
    assert resp.status_code == 200, (
        f"GET /api/v2/objectives returned HTTP {resp.status_code}"
    )
    return resp.json()


def delete_objective_via_api(api_session, caldera_server: str, objective_id: str) -> None:
    """Delete a single objective by id via the REST API (best-effort cleanup)."""
    api_session.delete(f"{caldera_server}/api/v2/objectives/{objective_id}")


# ---------------------------------------------------------------------------
# 1. h2 heading "Objectives" is visible
# ---------------------------------------------------------------------------

def test_objectives_page_heading(auth_page: Page, base_url: str) -> None:
    """
    Navigating to /objectives must render an <h2> element whose text is
    "Objectives", confirming the correct view has been routed to.
    """
    navigate_to_objectives(auth_page, base_url)

    heading = auth_page.locator("h2", has_text="Objectives")
    expect(heading).to_be_visible()


# ---------------------------------------------------------------------------
# 2. Introductory description paragraph is visible
# ---------------------------------------------------------------------------

def test_objectives_description_visible(auth_page: Page, base_url: str) -> None:
    """
    The ObjectivesView does not have a static description paragraph.
    Instead it shows an h2 heading and a source selector dropdown.
    We verify the page loaded correctly by checking the h2 and the
    <select> element for objectives are visible.
    """
    navigate_to_objectives(auth_page, base_url)

    # The h2 heading must be visible
    heading = auth_page.locator("h2", has_text="Objectives")
    expect(heading).to_be_visible()

    # The objective selector <select> must also be present
    selector = auth_page.locator("select")
    expect(selector.first).to_be_visible()


# ---------------------------------------------------------------------------
# 3. "New Objective" button is visible
# ---------------------------------------------------------------------------

def test_new_objective_button_visible(auth_page: Page, base_url: str) -> None:
    """
    The primary call-to-action button labelled "New Objective" must be present
    and visible in the left toolbar column alongside the selector dropdown.
    """
    navigate_to_objectives(auth_page, base_url)

    new_btn = auth_page.locator("button", has_text="New Objective")
    expect(new_btn).to_be_visible()


# ---------------------------------------------------------------------------
# 4. UI objective count matches API response count
# ---------------------------------------------------------------------------

def test_objectives_api_count_matches_ui(
    auth_page: Page, base_url: str, api_session, caldera_server: str
) -> None:
    """
    The number of objective entries available for selection in the dropdown
    or list must equal the count returned by GET /api/v2/objectives.

    The dropdown renders one <option> per objective (excluding any blank
    placeholder option).  When zero objectives exist the selector should be
    empty; when objectives exist their count must match.
    """
    objectives = get_objectives_from_api(api_session, caldera_server)
    api_count = len(objectives)

    navigate_to_objectives(auth_page, base_url)

    # The objective selector is a <select> element inside the .column.is-4 column.
    # Count <option> elements, ignoring the blank placeholder (value="").
    select_el = auth_page.locator("select")
    non_blank_options = select_el.locator("option:not([value=''])")
    ui_count = non_blank_options.count()

    assert ui_count == api_count, (
        f"UI shows {ui_count} objective option(s) but API returned {api_count}"
    )


# ---------------------------------------------------------------------------
# 5. First objective's name appears in the selector / dropdown
# ---------------------------------------------------------------------------

def test_objective_names_in_selector(
    auth_page: Page, base_url: str, api_session, caldera_server: str
) -> None:
    """
    When at least one objective exists, the name of the first objective
    returned by GET /api/v2/objectives must appear as a selectable option
    inside the left-column dropdown/selector, confirming that the Vue
    component populates the selector from API data.

    Skipped when no objectives are present.
    """
    objectives = get_objectives_from_api(api_session, caldera_server)

    if not objectives:
        pytest.skip("No objectives present — cannot verify selector contents.")

    first_name = objectives[0].get("name", "")
    if not first_name:
        pytest.skip("First objective has no name field — skipping.")

    navigate_to_objectives(auth_page, base_url)

    # The name should appear as an <option> inside the <select> element.
    select_el = auth_page.locator("select")
    name_option = select_el.locator(f"option", has_text=first_name)
    expect(name_option.first).to_be_attached()


# ---------------------------------------------------------------------------
# 6. Clicking "New Objective" creates a new entry; clean up via API
# ---------------------------------------------------------------------------

def test_new_objective_creates_entry(
    auth_page: Page, base_url: str, api_session, caldera_server: str
) -> None:
    """
    Clicking the "New Objective" button should trigger a POST to
    /api/v2/objectives and render the new entry in the selector.

    The test records the objective count before and after clicking, asserts
    an increase of exactly one, then deletes the newly created objective via
    the API to restore the original state.
    """
    # Record the count of objectives before the action.
    objectives_before = get_objectives_from_api(api_session, caldera_server)
    count_before = len(objectives_before)
    before_ids = {obj["id"] for obj in objectives_before}

    navigate_to_objectives(auth_page, base_url)

    new_btn = auth_page.locator("button", has_text="New Objective")
    expect(new_btn).to_be_visible()
    new_btn.click()

    # Wait for the network request triggered by the button click to complete.
    auth_page.wait_for_load_state("networkidle")

    # Verify the API now returns one more objective.
    objectives_after = get_objectives_from_api(api_session, caldera_server)
    count_after = len(objectives_after)

    assert count_after == count_before + 1, (
        f"Expected {count_before + 1} objectives after creation but found {count_after}"
    )

    # Identify the newly created objective by finding the id that wasn't there before.
    after_ids = {obj["id"] for obj in objectives_after}
    new_ids = after_ids - before_ids

    # Clean up: delete every objective that was created during this test.
    for new_id in new_ids:
        delete_objective_via_api(api_session, caldera_server, new_id)

    # Confirm restoration.
    objectives_final = get_objectives_from_api(api_session, caldera_server)
    assert len(objectives_final) == count_before, (
        f"Cleanup failed: expected {count_before} objectives but found {len(objectives_final)}"
    )


# ---------------------------------------------------------------------------
# 7. Selecting an objective shows its detail panel
# ---------------------------------------------------------------------------

def test_selecting_objective_shows_details(
    auth_page: Page, base_url: str, api_session, caldera_server: str
) -> None:
    """
    When at least one objective exists, clicking (selecting) the first
    objective in the dropdown should populate the right-hand detail panel
    with the objective's name, description, and goals table/section.

    The detail panel is rendered in the right column (.column.is-9) and
    becomes populated once the Vue reactive selection propagates.

    Skipped when no objectives are present.
    """
    objectives = get_objectives_from_api(api_session, caldera_server)

    if not objectives:
        pytest.skip("No objectives present — cannot verify detail panel.")

    first_objective = objectives[0]
    first_name = first_objective.get("name", "")

    navigate_to_objectives(auth_page, base_url)

    # The objective <select> element is in the .column.is-4 center column.
    select_el = auth_page.locator("select")
    expect(select_el.first).to_be_visible()

    # Select the option whose text matches the first objective's name.
    if first_name:
        select_el.first.select_option(label=first_name)
    else:
        # If name is blank, select by index (skip placeholder at 0).
        select_el.first.select_option(index=1)

    # Wait for the Vue reactive update to propagate.
    auth_page.wait_for_load_state("networkidle")

    # After selection the detail section (v-if="selectedObjective.id") should appear.
    # ObjectivesView renders an h3 with the objective name and a GoalsTable component.
    # Assert the Save button is visible (only rendered when isEditingNameDesc is true
    # or via the edit button). Actually, the Save button only appears after clicking edit.
    # Instead, assert the h3 with the objective name is visible in the detail area.
    if first_name:
        name_heading = auth_page.locator("h3", has_text=first_name)
        expect(name_heading.first).to_be_visible()
    else:
        # No name — just check that the detail content section is visible
        detail_content = auth_page.locator(".content")
        expect(detail_content.first).to_be_visible()

    # The goals section must also be visible (GoalsTable component renders a table).
    # Accept a <table>, <thead>, or any element within the .mt-5 goals container.
    goals_section = auth_page.locator(".mt-5")
    expect(goals_section.first).to_be_visible()
