# 🧪 MeepleMind E2E Tests with Playwright

## Overview

Automated end-to-end tests for MeopleMind using Playwright. Tests cover:
- ✅ Game registration with multiple players
- ✅ Game history viewing and management
- ✅ Game deletion
- ✅ Rating system
- ✅ Data export (CSV/JSON)
- ✅ Statistics display
- ✅ Theme toggle (light/dark mode)

## Installation

Playwright is already installed. If needed, reinstall browsers:

```bash
npx playwright install
```

## Running Tests

### Run all tests (headless mode)
```bash
npm run test:e2e
```

### Run tests with UI (recommended for development)
```bash
npm run test:e2e:ui
```

### Run tests with visible browser window
```bash
npm run test:e2e:headed
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:report
```

## Test Structure

- `tests/e2e/game-registration.spec.ts` - Main test suite
  - Register game with 5 players
  - Show game in history
  - Delete game
  - Toggle rating
  - Export to CSV
  - View statistics
  - Switch theme

## Test File Format

Tests use Playwright's standard format:

```typescript
test('should register a game with 5 players', async ({ page }) => {
  // Navigate and interact
  await page.click('text=Nova Partida');
  
  // Assert results
  await expect(page.locator('h1')).toContainText('Nova Partida');
});
```

## Key Features

### LocalStorage Testing
- Tests automatically clear localStorage before each test
- Verify data persistence with `page.evaluate()`

### Waits & Timeouts
- Uses `waitForLoadState('networkidle')` for navigation
- `waitForTimeout()` for state updates
- `isVisible()` for conditional waits

### Download Testing
```typescript
const downloadPromise = page.waitForEvent('download');
// Trigger download
const download = await downloadPromise;
expect(download.suggestedFilename()).toMatch(/pattern/);
```

## Configuration

See `playwright.config.ts` for:
- Multiple browser testing (Chromium, Firefox, WebKit)
- Parallel execution
- Retry on CI
- Base URL: `http://localhost:5173`
- Auto-starts dev server

## Debugging

### 1. Step Through a Test
```bash
npm run test:e2e:debug
```

### 2. Add Debug Statements
```typescript
await page.pause(); // Pauses test, opens Inspector
console.log(await page.locator('.selector').count());
```

### 3. Generate Traces
Traces are automatically captured on first retry and viewable in report

### 4. Screenshot on Failure
```typescript
await page.screenshot({ path: 'screenshot.png' });
```

## Common Issues

### Tests timeout
- Ensure dev server is running: `npm run dev`
- Check `baseURL` in `playwright.config.ts`

### localStorage not clearing
- Check browser cache settings
- Clear manually: `await page.evaluate(() => localStorage.clear())`

### Selector not found
- Run with `--headed` to see what page looks like
- Use `--debug` to pause and inspect DOM

## CI/CD Integration

In GitHub Actions or CI environment:

```yaml
- name: Install dependencies
  run: npm install

- name: Install Playwright browsers
  run: npx playwright install

- name: Run tests
  run: npm run test:e2e
```

See `playwright.config.ts` for CI-specific settings.

## Project Structure

```
tests/
├── e2e/
│   └── game-registration.spec.ts    # Main test suite
└── README.md                         # This file

Legacy test files (for reference):
├── test-form-validation.js           # Old manual validation
├── test-game-registration.js         # Old automated test
└── test-registration.html            # Old HTML test page
```

## Writing New Tests

1. Create file in `tests/e2e/` with `.spec.ts` extension
2. Import test harness:
   ```typescript
   import { test, expect } from '@playwright/test';
   ```
3. Write test:
   ```typescript
   test('should do something', async ({ page }) => {
     await page.goto('/');
     // ... interact and assert
   });
   ```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Locator Guide](https://playwright.dev/docs/locators)
- [API Reference](https://playwright.dev/docs/api/class-page)
