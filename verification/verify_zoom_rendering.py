
import time
from playwright.sync_api import sync_playwright

def verify_zoom(page):
    # 1. Load the game
    page.goto("http://localhost:8080")

    # 2. Wait for start screen and click
    start_overlay = page.locator("#start-screen")
    start_overlay.click(force=True)

    # 3. Wait for game to initialize
    time.sleep(2)

    # 4. Zoom out significantly to expose gaps if any
    # We can simulate wheel events or inject JS.
    # Injecting JS is more reliable to set a specific zoom level.
    # We need to access the internal camera state if possible, or just simulate wheel.
    # Let's simulate wheel events.
    # The game uses deltaY. Negative is zoom in, positive is zoom out (usually).
    # In src/input.js or main.js, let's check.
    # Usually wheel down (positive) -> zoom out.

    center_x = 400
    center_y = 300

    # Zoom out
    for _ in range(20):
        page.mouse.wheel(0, 100)
        time.sleep(0.1)

    time.sleep(1)

    # 5. Take screenshot
    page.screenshot(path="verification/after_fix.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 800, "height": 600})
        try:
            verify_zoom(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
