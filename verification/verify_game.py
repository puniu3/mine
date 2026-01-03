from playwright.sync_api import sync_playwright
import time

def verify_features():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game
        page.goto("http://localhost:3000")

        # Click start button
        page.click("#start-btn")

        # Wait for game to initialize
        time.sleep(2)

        # We need to test:
        # 1. UI is visible (Hotbar)
        # 2. Crafting Modal (hard to test without finding a workbench, but we can verify it's hidden initially)

        # Check hotbar exists
        hotbar = page.query_selector("#hotbar")
        if not hotbar:
            print("Error: Hotbar not found")
            return

        # Check crafting modal is hidden
        modal = page.query_selector("#crafting-modal")
        display = modal.evaluate("el => getComputedStyle(el).display")
        if display != "none":
            print(f"Error: Crafting modal should be hidden, but is {display}")

        # Inject a workbench near the player to test interaction
        # We can execute JS in the page to modify the world
        page.evaluate("""
            const p = window.player; // We need access to player/world variables.
            // Since main.js variables aren't global, this is hard unless we exposed them or exported them.
            // But main.js is a module.
            // We can't easily modify the state from outside unless we attached them to window.
        """)

        # Since I didn't attach world/player to window in main.js, I can't easily force a scenario.
        # However, I can take a screenshot of the game running.

        page.screenshot(path="verification/game_running.png")
        print("Screenshot saved to verification/game_running.png")

        browser.close()

if __name__ == "__main__":
    verify_features()
