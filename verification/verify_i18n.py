from playwright.sync_api import sync_playwright

def verify_languages():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set viewport to a size that might trigger scroll or at least wide enough
        page = browser.new_page(viewport={'width': 800, 'height': 600})

        # Load the game from local server
        page.goto("http://localhost:8080")

        # Wait for the language selector to appear (it's in the DOM at start)
        # We need to click the current language button to open the popup
        lang_btn = page.locator("#lang-current")
        lang_btn.wait_for()
        lang_btn.click()

        # Wait for popup to open
        popup = page.locator("#lang-popup")
        popup.wait_for(state="visible")

        # Wait a bit for animation
        page.wait_for_timeout(500)

        # Take a screenshot of the popup
        # We can take a screenshot of the specific element + some margin, or full page
        page.screenshot(path="verification/language_grid.png")

        # Print info about elements found
        buttons = popup.locator(".lang-option")
        count = buttons.count()
        print(f"Found {count} language buttons.")

        # Check specific new flags
        for lang in ['pl', 'uk', 'tr', 'ms']:
            btn = popup.locator(f"button[data-lang='{lang}']")
            if btn.count() > 0:
                print(f"Button for {lang} exists.")
                # Verify flag class
                flag = btn.locator(f".flag-icon.flag-{lang}")
                if flag.count() > 0:
                    print(f"Flag icon for {lang} exists.")
                else:
                    print(f"ERROR: Flag icon for {lang} MISSING.")
            else:
                print(f"ERROR: Button for {lang} MISSING.")

        browser.close()

if __name__ == "__main__":
    verify_languages()
