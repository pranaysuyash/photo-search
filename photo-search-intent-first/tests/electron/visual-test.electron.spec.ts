import {
  test,
  ElectronApplication,
  Page,
  _electron as electron,
} from "@playwright/test";
import { resolve } from "path";

test.describe("Electron App Visual Testing Suite", () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    console.log("🚀 Starting Electron app for visual testing...");

    // Start Electron app
    electronApp = await electron.launch({
      executablePath: "/opt/homebrew/bin/npx",
      args: ["electron", resolve(__dirname, "../../electron/main.js")],
      timeout: 60000, // Increased timeout
      env: {
        ...process.env,
        NODE_ENV: "development",
        ELECTRON_IS_DEV: "1",
      },
    });

    console.log("📱 Waiting for Electron window to be created...");
    // Wait for the main window to be created - this can take time
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds

    // Get the main window
    page = await electronApp.firstWindow();
    console.log("📱 Got main window, waiting for load...");

    // Wait for the page to load
    await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
    await page.waitForTimeout(10000); // Extra wait for app initialization

    console.log("✅ Page loaded, starting visual tests...");
  });

  test.afterAll(async () => {
    console.log("🛑 Closing Electron app...");
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("📸 Initial app load - visual check", async () => {
    console.log("🔍 Checking initial app state...");

    // Take screenshot of initial state
    await page.screenshot({
      path: "test-results/electron/01-initial-load.png",
      fullPage: true,
    });

    // Get basic page info
    const title = await page.title();
    const url = page.url();
    console.log(`📄 Page title: "${title}"`);
    console.log(`🔗 Page URL: ${url}`);

    // Check if page is blank or has content
    const bodyText = await page.textContent("body");
    const bodyTextLength = bodyText?.length || 0;
    console.log(`📝 Body content length: ${bodyTextLength} characters`);

    if (bodyTextLength < 50) {
      console.log("⚠️  WARNING: Page appears to be blank or nearly empty!");
      console.log(`📄 Body text: "${bodyText || "EMPTY"}"`);
    }

    // Check for React root element
    const reactRoot = page.locator("#root");
    const rootExists = (await reactRoot.count()) > 0;
    console.log(`⚛️  React root exists: ${rootExists}`);

    if (rootExists) {
      const rootContent = await reactRoot.textContent();
      const rootContentLength = rootContent?.length || 0;
      console.log(
        `⚛️  React root content length: ${rootContentLength} characters`
      );

      if (rootContentLength === 0) {
        console.log("⚠️  WARNING: React root is empty!");
      }
    }

    // Check HTML structure
    const htmlStructure = await page.evaluate(() => {
      const body = document.body;
      return {
        hasChildren: body.children.length > 0,
        childrenCount: body.children.length,
        innerHTML:
          body.innerHTML.substring(0, 500) +
          (body.innerHTML.length > 500 ? "..." : ""),
        classes: body.className,
        style: body.style.cssText,
      };
    });

    console.log("🏗️  HTML Structure:", JSON.stringify(htmlStructure, null, 2));
  });

  test("🎯 Component detection and analysis", async () => {
    console.log("🔎 Analyzing UI components...");

    await page.waitForTimeout(2000);

    // Look for common UI elements
    const selectors = {
      Navigation: ["nav", '[role="navigation"]', ".navbar", ".nav"],
      Header: ["header", '[role="banner"]', ".header"],
      "Main Content": ["main", '[role="main"]', ".main", ".content"],
      Buttons: ["button", '[role="button"]', 'input[type="button"]'],
      "Search Input": [
        'input[type="search"]',
        'input[placeholder*="search" i]',
        ".search input",
      ],
      "Images/Photos": ["img", ".photo", ".image", '[data-testid*="photo"]'],
      Sidebar: [".sidebar", ".menu", ".nav-sidebar"],
      Modals: [".modal", '[role="dialog"]', ".popup"],
      Forms: ["form", ".form"],
      Lists: ["ul", "ol", ".list", '[role="list"]'],
    };

    const analysis: Record<string, any> = {};

    for (const [category, selectorList] of Object.entries(selectors)) {
      analysis[category] = {
        found: false,
        count: 0,
        visible: 0,
        details: [],
      };

      for (const selector of selectorList) {
        const elements = await page.locator(selector).all();
        if (elements.length > 0) {
          analysis[category].found = true;
          analysis[category].count += elements.length;

          for (const element of elements) {
            const isVisible = await element.isVisible().catch(() => false);
            if (isVisible) {
              analysis[category].visible++;
              const text = await element.textContent().catch(() => "");
              const tagName = await element
                .evaluate((el) => el.tagName)
                .catch(() => "");
              analysis[category].details.push({
                selector,
                tagName,
                text: text?.trim().substring(0, 100),
                visible: isVisible,
              });
            }
          }
        }
      }
    }

    console.log("📊 Component Analysis Results:");
    for (const [category, data] of Object.entries(analysis)) {
      console.log(
        `  ${data.found ? "✅" : "❌"} ${category}: ${data.count} total, ${
          data.visible
        } visible`
      );
      if (data.details.length > 0) {
        data.details.forEach((detail: any, i: number) => {
          console.log(
            `    ${i + 1}. ${detail.tagName} - "${detail.text || "no text"}" (${
              detail.visible ? "visible" : "hidden"
            })`
          );
        });
      }
    }

    // Take screenshot after analysis
    await page.screenshot({
      path: "test-results/electron/02-component-analysis.png",
      fullPage: true,
    });
  });

  test("🔄 Navigation and routing test", async () => {
    console.log("🧭 Testing navigation and routing...");

    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    console.log(`🔗 Current URL: ${currentUrl}`);

    // Look for navigation elements
    const navElements = await page
      .locator('a, [role="link"], button[data-testid*="nav"], .nav-item')
      .all();
    console.log(`🔗 Found ${navElements.length} potential navigation elements`);

    const navAnalysis = [];
    for (let i = 0; i < Math.min(navElements.length, 10); i++) {
      try {
        const element = navElements[i];
        const text = await element.textContent();
        const href = await element.getAttribute("href");
        const isVisible = await element.isVisible();
        const tagName = await element.evaluate((el) => el.tagName);

        navAnalysis.push({
          index: i,
          text: text?.trim(),
          href,
          visible: isVisible,
          tagName,
        });
      } catch (e) {
        console.log(
          `❌ Error analyzing nav element ${i}:`,
          (e as Error).message
        );
      }
    }

    console.log("🧭 Navigation Elements Analysis:");
    navAnalysis.forEach((nav) => {
      console.log(
        `  ${nav.visible ? "👁️" : "👁️‍🗨️"} ${nav.tagName}: "${nav.text}" ${
          nav.href ? `(${nav.href})` : ""
        }`
      );
    });

    // Try to click first visible navigation element
    const firstVisibleNav = navAnalysis.find((nav) => nav.visible && nav.text);
    if (firstVisibleNav && navElements[firstVisibleNav.index]) {
      try {
        console.log(`🖱️  Attempting to click: "${firstVisibleNav.text}"`);
        await navElements[firstVisibleNav.index].click({ timeout: 5000 });
        await page.waitForTimeout(2000);

        const newUrl = page.url();
        console.log(`🔗 URL after navigation: ${newUrl}`);

        await page.screenshot({
          path: "test-results/electron/03-after-navigation.png",
          fullPage: true,
        });
      } catch (e) {
        console.log("❌ Navigation click failed:", (e as Error).message);
      }
    }

    await page.screenshot({
      path: "test-results/electron/03-navigation-test.png",
      fullPage: true,
    });
  });

  test("🔍 Search functionality test", async () => {
    console.log("🔎 Testing search functionality...");

    await page.waitForTimeout(1000);

    const searchSelectors = [
      'input[type="search"]',
      'input[placeholder*="search" i]',
      'input[placeholder*="Search"]',
      ".search input",
      '[data-testid*="search"] input',
      'input[name*="search" i]',
    ];

    let searchInput = null;
    let usedSelector = "";

    for (const selector of searchSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count();
      if (count > 0) {
        const isVisible = await element.isVisible();
        if (isVisible) {
          searchInput = element;
          usedSelector = selector;
          console.log(`✅ Found search input with selector: ${selector}`);
          break;
        }
      }
    }

    if (searchInput) {
      try {
        // Interact with search input
        console.log("🖱️  Clicking search input...");
        await searchInput.click();

        console.log("⌨️  Typing search query...");
        await searchInput.fill("test search query");

        await page.screenshot({
          path: "test-results/electron/04-search-input-filled.png",
          fullPage: true,
        });

        // Look for search button or submit
        const searchButtons = [
          'button:has-text("Search")',
          'button[type="submit"]',
          'input[type="submit"]',
          ".search button",
          '[data-testid*="search"] button',
        ];

        let searchButton = null;
        for (const buttonSelector of searchButtons) {
          const button = page.locator(buttonSelector).first();
          if ((await button.count()) > 0 && (await button.isVisible())) {
            searchButton = button;
            console.log(`✅ Found search button: ${buttonSelector}`);
            break;
          }
        }

        if (searchButton) {
          console.log("🖱️  Clicking search button...");
          await searchButton.click();
          await page.waitForTimeout(3000); // Wait for search results

          await page.screenshot({
            path: "test-results/electron/04-search-results.png",
            fullPage: true,
          });
        } else {
          // Try pressing Enter
          console.log("⌨️  Pressing Enter to search...");
          await searchInput.press("Enter");
          await page.waitForTimeout(3000);

          await page.screenshot({
            path: "test-results/electron/04-search-enter.png",
            fullPage: true,
          });
        }

        // Check for results
        const resultsSelectors = [
          ".results",
          ".search-results",
          '[data-testid*="results"]',
          ".photos",
          ".images",
          ".grid",
          ".list",
        ];

        let resultsFound = false;
        for (const selector of resultsSelectors) {
          const results = await page.locator(selector).count();
          if (results > 0) {
            console.log(
              `📊 Found results with selector ${selector}: ${results} elements`
            );
            resultsFound = true;
          }
        }

        if (!resultsFound) {
          console.log("❌ No search results found");
        }
      } catch (e) {
        console.log("❌ Search interaction failed:", (e as Error).message);
      }
    } else {
      console.log("❌ No search input found");
      await page.screenshot({
        path: "test-results/electron/04-no-search-input.png",
        fullPage: true,
      });
    }
  });

  test("⚡ Performance and loading analysis", async () => {
    console.log("📊 Analyzing performance and loading...");

    // Reload page to test loading
    console.log("🔄 Reloading page...");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000); // Wait for complete load

    // Check for loading indicators
    const loadingSelectors = [
      ".loading",
      '[data-testid*="loading"]',
      ".spinner",
      ".loader",
      ".skeleton",
      '[aria-busy="true"]',
      ".progress",
    ];

    const loadingElements = [];
    for (const selector of loadingSelectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        for (const element of elements) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            loadingElements.push({ selector, visible: true });
          }
        }
      }
    }

    console.log(`🔄 Loading indicators found: ${loadingElements.length}`);
    loadingElements.forEach((loading) => {
      console.log(`  ⏳ ${loading.selector}`);
    });

    // Get console errors
    const consoleMessages: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleMessages.push(msg.text());
      }
    });

    // Wait and check again
    await page.waitForTimeout(3000);

    // Get performance metrics
    const performanceData = await page.evaluate(() => {
      return {
        readyState: document.readyState,
        visibilityState: document.visibilityState,
        location: window.location.href,
        title: document.title,
        bodyChildrenCount: document.body.children.length,
        hasReactRoot: !!document.getElementById("root"),
        reactRootContent:
          document.getElementById("root")?.innerHTML.length || 0,
      };
    });

    console.log(
      "📊 Performance Analysis:",
      JSON.stringify(performanceData, null, 2)
    );

    if (consoleMessages.length > 0) {
      console.log("❌ Console Errors:");
      consoleMessages.forEach((msg, i) => {
        console.log(`  ${i + 1}. ${msg}`);
      });
    }

    // Final screenshot
    await page.screenshot({
      path: "test-results/electron/05-final-state.png",
      fullPage: true,
    });

    // Generate summary report
    const summary = {
      timestamp: new Date().toISOString(),
      testResults: {
        pageLoaded: performanceData.readyState === "complete",
        hasContent: performanceData.bodyChildrenCount > 0,
        reactMounted:
          performanceData.hasReactRoot && performanceData.reactRootContent > 0,
        consoleErrors: consoleMessages.length,
        loadingIndicators: loadingElements.length,
      },
      performanceData,
      consoleErrors: consoleMessages,
    };

    console.log("📋 VISUAL TEST SUMMARY:", JSON.stringify(summary, null, 2));
  });
});
