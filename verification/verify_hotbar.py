from playwright.sync_api import sync_playwright

def verify_hotbar_indicators():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Emulate a mobile device or narrow screen to trigger horizontal scrolling
        context = browser.new_context(
            viewport={'width': 375, 'height': 667},
            device_scale_factor=2
        )
        page = context.new_page()

        # Navigate to the game
        page.goto("http://localhost:8080/index.html")

        # Wait for game to load (title screen)
        # Click Start to get to the game view where hotbar is visible
        # Note: Depending on logic, hotbar might be visible immediately or after clicking start
        # The hotbar is in #ui-layer which is always present but might be obscured by start screen
        # Let's click "Start"

        # Click "Start" (using data-i18n to identify the button if needed, or id)
        page.click('#start-btn', force=True)

        # Wait a bit for transition
        page.wait_for_timeout(2000)

        # Force some items into the hotbar if needed, or rely on defaults.
        # The hotbar needs to overflow to show indicators.
        # Default hotbar items might not be enough to overflow 375px?
        # HOTBAR_ITEMS count is usually 9 or so. 9 * 40px = 360px + gaps.
        # With 375px screen width, it might barely overflow or not.
        # Let's reduce viewport width to be sure.
        page.set_viewport_size({"width": 300, "height": 600})

        # Wait for indicators to update
        page.wait_for_timeout(1000)

        # Take a screenshot of the bottom area where hotbar is
        # We can clip the screenshot to the hotbar area
        hotbar = page.locator('#hotbar-wrapper')
        if hotbar.is_visible():
            hotbar.screenshot(path='/home/jules/verification/hotbar_overlay.png')
            print("Screenshot taken: hotbar_overlay.png")
        else:
            print("Hotbar not visible")
            page.screenshot(path='/home/jules/verification/full_page_fail.png')

        browser.close()

if __name__ == "__main__":
    verify_hotbar_indicators()
