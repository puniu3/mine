import os
from playwright.sync_api import sync_playwright

def verify_gamepad_diagram():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        # Go to the local server
        page.goto("http://localhost:8080/index.html")

        # Wait for the instructions card to appear
        page.wait_for_selector(".instructions-card")

        # Take a screenshot of the whole page to verify styles (sky background)
        page.screenshot(path="verification/final_check.png")

        browser.close()

if __name__ == "__main__":
    os.makedirs("verification", exist_ok=True)
    verify_gamepad_diagram()
