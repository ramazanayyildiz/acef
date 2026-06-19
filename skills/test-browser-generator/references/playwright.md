---
title: playwright
type: note
permalink: ram/04-ai-toolkit/skills/test/test-browser-generator/references/playwright
---

# Playwright Reference

Syntax, helpers, and patterns for `test-browser-generator` when generating Playwright tests.

---

## Setup

```bash
npm init playwright@latest
npx playwright install
npx playwright test                          # run all
npx playwright test tests/e2e/login.spec.ts  # run one file
npx playwright test --grep "user can login"  # run by name
npx playwright test --ui                     # interactive UI mode
npx playwright show-report                   # view HTML report
```

---

## Base Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature name', () => {
    test.beforeEach(async ({ page }) => {
        // shared setup
    });

    test('user can do something', async ({ page }) => {
        await page.goto('/your-route');
        await expect(page.getByText('Expected text')).toBeVisible();
    });
});
```

---

## playwright.config.ts — Recommended Base Config

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: process.env.APP_URL ?? 'http://localhost:8000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    ],
});
```

---

## Authentication — Reusable Auth State

```typescript
// tests/e2e/auth.setup.ts — run once, reuse cookie state
import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('secret');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('/dashboard');
    await page.context().storageState({ path: authFile });
});
```

```typescript
// playwright.config.ts — use saved auth state
projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
        name: 'chromium',
        use: {
            ...devices['Desktop Chrome'],
            storageState: 'tests/.auth/user.json',
        },
        dependencies: ['setup'],
    },
],
```

---

## Selectors — Priority Order

```typescript
// 1. ARIA role + name (most accessible, most stable)
page.getByRole('button', { name: 'Submit' })
page.getByRole('textbox', { name: 'Email' })
page.getByRole('heading', { name: 'Dashboard' })

// 2. Label (for form fields)
page.getByLabel('Email address')
page.getByLabel('Password')

// 3. Placeholder
page.getByPlaceholder('Enter your email')

// 4. Text content
page.getByText('Welcome back')
page.getByText('Submit', { exact: true })

// 5. Test ID (data-testid attribute)
page.getByTestId('submit-button')
page.getByTestId('email-input')

// 6. CSS selector (last resort)
page.locator('#submit-btn')
page.locator('.success-message')
```

---

## Navigation

```typescript
await page.goto('/path')
await page.goto('https://example.com')
await page.goBack()
await page.goForward()
await page.reload()

// Assert URL
await expect(page).toHaveURL('/expected/path')
await expect(page).toHaveURL(/dashboard/)
await expect(page).toHaveTitle('Page Title')
```

---

## Interacting with Elements

```typescript
// Clicking
await page.getByRole('button', { name: 'Submit' }).click()
await page.getByTestId('delete-btn').click()

// Typing
await page.getByLabel('Title').fill('My Title')
await page.getByTestId('search-input').clear()
await page.getByTestId('search-input').fill('search term')

// Select / checkbox / radio
await page.getByLabel('Status').selectOption('published')
await page.getByLabel('Status').selectOption({ label: 'Published' })
await page.getByLabel('Remember me').check()
await page.getByLabel('Remember me').uncheck()
await page.getByLabel('Option A').check()  // radio

// File upload
await page.getByLabel('Upload').setInputFiles('tests/fixtures/test.pdf')
await page.getByLabel('Upload').setInputFiles([]) // clear

// Keyboard
await page.keyboard.press('Enter')
await page.keyboard.press('Tab')
await page.getByTestId('input').press('Escape')
```

---

## Waiting

Playwright auto-waits for elements — explicit waits are rarely needed.

```typescript
// Auto-wait (built in — no explicit wait needed for most cases)
await page.getByRole('button').click()  // waits until clickable

// Wait for navigation
await page.waitForURL('/dashboard')
await page.waitForURL(/dashboard/)

// Wait for element state
await page.getByTestId('spinner').waitFor({ state: 'hidden' })
await page.getByTestId('success').waitFor({ state: 'visible' })

// Wait for network
await page.waitForResponse('**/api/press-releases')
await page.waitForLoadState('networkidle')

// Custom timeout (override default 30s)
await page.getByTestId('slow-element').waitFor({ timeout: 10000 })
```

---

## Assertions (expect)

```typescript
// Visibility
await expect(page.getByTestId('success-message')).toBeVisible()
await expect(page.getByTestId('error-message')).toBeHidden()
await expect(page.getByTestId('submit-btn')).toBeEnabled()
await expect(page.getByTestId('submit-btn')).toBeDisabled()

// Text content
await expect(page.getByTestId('title')).toHaveText('My Title')
await expect(page.getByTestId('title')).toContainText('Title')
await expect(page).toHaveTitle('Page Title')

// Input values
await expect(page.getByLabel('Email')).toHaveValue('user@example.com')
await expect(page.getByLabel('Status')).toHaveValue('published')
await expect(page.getByLabel('Remember me')).toBeChecked()

// URL
await expect(page).toHaveURL('/dashboard')
await expect(page).toHaveURL(/\/press-releases\/\d+/)

// Count
await expect(page.getByRole('row')).toHaveCount(5)
await expect(page.getByTestId('press-release-item')).toHaveCount(3)

// Attribute
await expect(page.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/edit/1')

// Negative assertions
await expect(page.getByTestId('admin-panel')).not.toBeVisible()
```

---

## Modals and Dialogs

```typescript
// Native JS dialog (alert/confirm/prompt)
page.on('dialog', async dialog => {
    expect(dialog.message()).toBe('Are you sure?');
    await dialog.accept();
    // or: await dialog.dismiss();
});
await page.getByRole('button', { name: 'Delete' }).click();

// Custom modal component
await page.getByRole('button', { name: 'Open Modal' }).click();
await expect(page.getByRole('dialog')).toBeVisible();
await expect(page.getByRole('dialog')).toContainText('Modal title');
await page.getByRole('button', { name: 'Close' }).click();
await expect(page.getByRole('dialog')).not.toBeVisible();
```

---

## API Mocking (intercept network requests)

```typescript
// Mock API response
await page.route('**/api/press-releases', async route => {
    await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
    });
});

// Block a request
await page.route('**/analytics/**', route => route.abort());

// Modify response
await page.route('**/api/user', async route => {
    const response = await route.fetch();
    const json = await response.json();
    json.role = 'admin';
    await route.fulfill({ response, json });
});
```

---

## Full Example Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Press Release Management', () => {

    test.beforeEach(async ({ page }) => {
        // Auth state loaded from storageState in config
        await page.goto('/press-releases');
    });

    test('authenticated user can create a press release', async ({ page }) => {
        // Arrange
        await page.getByRole('link', { name: 'Create New' }).click();
        await expect(page).toHaveURL('/press-releases/create');

        // Act
        await page.getByLabel('Title').fill('My Press Release');
        await page.getByLabel('Body').fill('Content here.');
        await page.getByLabel('Status').selectOption('draft');
        await page.getByRole('button', { name: 'Save' }).click();

        // Assert
        await expect(page).toHaveURL(/\/press-releases\/\d+/);
        await expect(page.getByTestId('success-toast')).toContainText('Created successfully');
    });

    test('form shows validation errors on empty submit', async ({ page }) => {
        await page.goto('/press-releases/create');
        await page.getByRole('button', { name: 'Save' }).click();

        await expect(page.getByTestId('title-error')).toBeVisible();
        await expect(page.getByTestId('title-error')).toContainText('required');
        await expect(page).toHaveURL('/press-releases/create'); // did not navigate away
    });

    test('guest is redirected to login page', async ({ browser }) => {
        // Create a fresh context with no auth state
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('/press-releases/create');
        await expect(page).toHaveURL('/login');

        await context.close();
    });

    test('admin sees delete button, editor does not', async ({ page, browser }) => {
        // Current page uses admin auth (from storageState)
        await expect(page.getByTestId('bulk-delete-btn')).toBeVisible();

        // Create editor context
        const editorContext = await browser.newContext({
            storageState: 'tests/.auth/editor.json',
        });
        const editorPage = await editorContext.newPage();
        await editorPage.goto('/press-releases');
        await expect(editorPage.getByTestId('bulk-delete-btn')).not.toBeVisible();

        await editorContext.close();
    });
});
```

---

## Common data-testid Attributes to Request from Frontend

When generating Playwright tests, list these that need to be added to the HTML:

```
data-testid="submit-button"
data-testid="cancel-button"
data-testid="{field-name}-error"
data-testid="success-toast"
data-testid="error-toast"
data-testid="loading-spinner"
data-testid="{feature}-item"          (for list items)
data-testid="{feature}-{id}-row"      (for table rows)
data-testid="{feature}-delete-btn"
data-testid="admin-panel"
data-testid="empty-state"
```

---

## File Structure

```
tests/
  e2e/
    auth.setup.ts           ← auth state setup
    press-releases.spec.ts  ← feature tests
    dashboard.spec.ts
  fixtures/
    test.pdf
    test-image.png
  .auth/
    user.json               ← saved auth state (gitignored)
    admin.json
    editor.json
playwright.config.ts
```