import time
from playwright.sync_api import sync_playwright

def verify_game_load(page):
    page.goto("http://localhost:8080/index.html")

    # Wait for start screen
    page.wait_for_selector("#start-screen")

    # Click Start
    page.click("#start-btn", force=True)

    # Wait for game initialization
    time.sleep(3) # Give it time to generate world and init Pixi

    # Check if canvas exists
    canvas = page.locator("#gameCanvas")
    if canvas.count() == 0:
        print("Canvas not found!")
    else:
        print("Canvas found.")

    # Check Pixi Global
    is_pixi_loaded = page.evaluate("() => !!window.PIXI")
    print(f"Pixi Loaded: {is_pixi_loaded}")

    # Screenshot
    page.screenshot(path="verification/game_render_fixed.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console logs to catch errors
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Page Error: {exc}"))

        try:
            verify_game_load(page)
        finally:
            browser.close()
