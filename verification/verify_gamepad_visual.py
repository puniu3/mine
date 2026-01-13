from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 800, "height": 600})
        # Assuming the server is running on port 8000
        page.goto("http://localhost:8000")

        # Wait for the gamepad instructions to appear
        # (It's static HTML now, but verify it exists)
        page.wait_for_selector(".gamepad-visual", state="visible")

        # Take a screenshot
        page.screenshot(path="verification/gamepad_visual.png")
        print("Screenshot saved to verification/gamepad_visual.png")

        browser.close()

if __name__ == "__main__":
    run()
