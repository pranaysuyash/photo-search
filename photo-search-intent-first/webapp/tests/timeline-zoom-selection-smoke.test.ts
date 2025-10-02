import { expect, type Page, test } from "@playwright/test";
import { safeClick, waitForAppReady } from "./utils/test-helpers";

const MOCK_DIR = "/tmp/playwright-library";
const MOCK_RESULTS = [
	{
		path: `${MOCK_DIR}/2024/07/15/beach-sunrise.jpg`,
		score: 0.98,
	},
	{
		path: `${MOCK_DIR}/2024/07/16/hiking-trail.jpg`,
		score: 0.95,
	},
	{
		path: `${MOCK_DIR}/2024/07/25/city-night.jpg`,
		score: 0.93,
	},
	{
		path: `${MOCK_DIR}/2024/08/02/family-park.jpg`,
		score: 0.91,
	},
];

const METADATA_FIXTURES: Record<string, { meta: Record<string, unknown> }> = {
	[`${MOCK_DIR}/2024/07/15/beach-sunrise.jpg`]: {
		meta: { mtime: 1721025600, camera: "Alpha A7", iso: 200 },
	},
	[`${MOCK_DIR}/2024/07/16/hiking-trail.jpg`]: {
		meta: { mtime: 1721112000, camera: "Alpha A7", iso: 400 },
	},
	[`${MOCK_DIR}/2024/07/25/city-night.jpg`]: {
		meta: { mtime: 1721889600, camera: "FX30", iso: 800 },
	},
	[`${MOCK_DIR}/2024/08/02/family-park.jpg`]: {
		meta: { mtime: 1722577200, camera: "FX30", iso: 100 },
	},
};

async function seedLocalStorage(page: Page) {
	await page.addInitScript(
		({ dir }) => {
			try {
				const persisted = {
					state: {
						dir,
						engine: "local",
						useFast: false,
						fastKind: "",
						useCaps: false,
						vlmModel: "Qwen/Qwen2-VL-2B-Instruct",
						useOcr: false,
						hasText: false,
						useOsTrash: false,
						searchCommandCenter: false,
						showExplain: false,
						showInfoOverlay: false,
						camera: "",
						isoMin: 0,
						isoMax: 0,
						fMin: 0,
						fMax: 0,
						place: "",
						enableDemoLibrary: true,
					},
					version: 0,
				};
				localStorage.setItem(
					"photo-search-settings",
					JSON.stringify(persisted),
				);
				localStorage.setItem("hasSeenOnboarding", "true");
				localStorage.setItem("onboardingComplete", "true");
				localStorage.setItem("showWelcome", "false");
			} catch (error) {
				console.warn("Failed seeding localStorage for tests", error);
			}
		},
		{ dir: MOCK_DIR },
	);
}

function fulfillJson(route: any, data: unknown, status = 200) {
	return route.fulfill({
		status,
		contentType: "application/json",
		body: JSON.stringify(data),
	});
}

async function primeApiMocks(page: Page) {
	await seedLocalStorage(page);

	await page.route("**/auth/status", (route) =>
		fulfillJson(route, { auth_required: false }),
	);
	await page.route("**/analytics*", (route) =>
		fulfillJson(route, { events: [] }),
	);
	await page.route("**/favorites?*", (route) =>
		fulfillJson(route, { favorites: [] }),
	);
	await page.route("**/saved", (route) => fulfillJson(route, { saved: [] }));
	await page.route("**/tags?*", (route) => fulfillJson(route, { tags: [] }));
	await page.route("**/library?*", (route) =>
		fulfillJson(route, { items: [] }),
	);
	await page.route("**/analytics/log", (route) =>
		fulfillJson(route, { ok: true }),
	);
	await page.route("**/operations/status*", (route) => fulfillJson(route, {}));

	await page.route("**/search", async (route) => {
		if (route.request().method() !== "POST") {
			await route.continue();
			return;
		}
		fulfillJson(route, {
			search_id: "playwright-demo",
			results: MOCK_RESULTS,
			cached: false,
		});
	});

	await page.route("**/metadata/detail", (route) => {
		const url = new URL(route.request().url());
		const path = url.searchParams.get("path") ?? "";
		const payload = METADATA_FIXTURES[path] ?? { meta: { mtime: 1722577200 } };
		fulfillJson(route, payload);
	});
}

async function performMockSearch(page: Page) {
	const searchInput = page.getByPlaceholder(
		"What are you looking for? Try 'kids at the park' or 'last summer'",
	);
	await expect(searchInput).toBeVisible();
	await searchInput.fill("playwright timeline demo");
	await searchInput.press("Enter");

	await expect(
		page.waitForResponse(
			(response) =>
				response.url().includes("/search") &&
				response.request().method() === "POST",
		),
	).resolves;

	await page.waitForTimeout(300);
}

async function bootstrap(page: Page) {
	await primeApiMocks(page);
	await waitForAppReady(page, { skipOnboarding: true });
	await performMockSearch(page);
}

test.describe("Timeline zoom controls", () => {
	test.beforeEach(async ({ page }) => {
		await bootstrap(page);
	});

	test("Ctrl/⌘ scroll adjusts zoom buckets", async ({ page }) => {
		await safeClick(page, 'button:has-text("Timeline")');
		await expect(
			page.getByRole("button", { name: "Zoom timeline in" }),
		).toBeVisible();

		const zoomInButton = page.getByRole("button", { name: "Zoom timeline in" });
		await zoomInButton.click();
		await expect(page.getByText(/Timeline zoom level/)).toContainText(/Weeks/);

		await zoomInButton.click();
		await expect(page.getByText(/Timeline zoom level/)).toContainText(/Days/);

		await page.dispatchEvent("body", "wheel", {
			deltaY: 160,
			ctrlKey: true,
		});
		await expect(page.getByText(/Timeline zoom level/)).toContainText(/Weeks/);
	});

	test("Keyboard +/- triggers zoom transitions", async ({ page }) => {
		await safeClick(page, 'button:has-text("Timeline")');

		await page.keyboard.press("+");
		await expect(page.getByText(/Timeline zoom level/)).toContainText(/Days/);

		await page.keyboard.press("-");
		await expect(page.getByText(/Timeline zoom level/)).toContainText(/Weeks/);
	});
});

test.describe("Selection-aware top bar", () => {
	test.beforeEach(async ({ page }) => {
		await bootstrap(page);
	});

	test("Selecting photos swaps top bar mode", async ({ page }) => {
		await safeClick(page, 'button:has-text("Timeline")');

		const firstItem = page.locator('div[role="button"]').first();
		await expect(firstItem).toBeVisible();
		await firstItem.click();

		const clearButton = page.getByRole("button", { name: "Clear selection" });
		await expect(clearButton).toBeVisible();
		await expect(page.getByText(/photo selected/)).toBeVisible();

		await clearButton.click();
		await expect(clearButton).not.toBeVisible();
	});
});
