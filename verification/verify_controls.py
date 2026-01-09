
from playwright.sync_api import sync_playwright

def verify_controls():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Emulate a mobile device to ensure touch controls are visible/layout is correct
        context = browser.new_context(
            viewport={'width': 375, 'height': 667},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
        )
        page = context.new_page()

        try:
            # Go to the local server
            page.goto("http://localhost:8080/")

            # Wait for the mobile controls to be visible.
            # Note: The start screen covers them initially, but we can target the elements.
            # Actually, controls are in #ui-layer which is on top, but maybe hidden or under start screen z-index?
            # Start screen z-index 2000. UI layer z-index is not set but children are.
            # #mobile-controls z-index 1100.
            # So start screen covers them. We need to click "Start" to see the game and controls.

            # Click "Start" (Fresh start)
            page.get_by_role("button", name="はじめる").click(force=True)

            # Wait for game to load/controls to appear.
            # #mobile-controls is visible by default in CSS, but hidden by JS on keydown.
            # We are on mobile emulation, so no keydown unless we trigger it.

            page.wait_for_selector("#mobile-controls", state="visible")

            # Take a screenshot of the controls area
            controls = page.locator("#mobile-controls")
            controls.screenshot(path="verification/controls.png")

            # Also take a full page screenshot for context
            page.screenshot(path="verification/full_page.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_controls()
