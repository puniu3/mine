from playwright.sync_api import sync_playwright
import time

def verify_title_screen():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a context with viewport similar to a desktop/tablet
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Load the page
        page.goto("http://localhost:8080/index.html")

        # Wait for the title screen to be visible
        page.wait_for_selector("#start-screen")

        # Take a screenshot of the default (ja) state
        page.screenshot(path="verification/title_screen_ja.png")
        print("Captured JA title screen")

        # Now change language to English (non-CJK) to test the style change
        # Open language popup
        page.click("#lang-current")
        # Select English
        page.click("button[data-lang='en']")

        # Wait a bit for transition
        time.sleep(1)

        # Verify lang attribute changed
        lang_attr = page.evaluate("document.documentElement.lang")
        print(f"Current lang attribute: {lang_attr}")

        # Take a screenshot of the EN state
        page.screenshot(path="verification/title_screen_en.png")
        print("Captured EN title screen")

        # Get computed style of the start button to verify font size
        font_size = page.evaluate("window.getComputedStyle(document.querySelector('.action-btn.primary-style')).fontSize")
        print(f"EN Primary Button Font Size: {font_size}")

        browser.close()

if __name__ == "__main__":
    verify_title_screen()
