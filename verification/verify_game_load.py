
from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to game...")
            page.goto("http://localhost:8080")

            # Wait for game to load
            print("Waiting for game load...")
            page.wait_for_selector("#start-btn", timeout=10000)

            # Click start (force=True as per memory)
            print("Clicking start...")
            page.click("#start-btn", force=True)

            # Wait for game initialization
            time.sleep(5)

            # Check for console errors?
            # (Playwright logs them if configured, but here we just want to ensure it runs)

            # Take screenshot of the gameplay (should see background)
            print("Taking screenshot...")
            page.screenshot(path="verification/background_test.png")
            print("Screenshot saved to verification/background_test.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
