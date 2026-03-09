# End-to-End Testing

This directory contains end-to-end tests for the TrustAnchor frontend application using Playwright.

## Overview

The E2E tests cover critical user flows, including:
- **Connect Wallet → Request Loan**: Complete flow from wallet connection to loan submission

## Structure

```
e2e/
├── fixtures/
│   └── wallet.ts          # Wallet mocking fixtures
├── helpers/
│   └── api-mock.ts        # API mocking utilities
├── wallet-to-loan.spec.ts # Main E2E test suite
└── README.md
```

## Running Tests

### Run all tests (headless)
```bash
npm run test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Test Coverage

### Connect Wallet → Request Loan Flow

The main test suite (`wallet-to-loan.spec.ts`) covers:

1. **Happy Path**: Successfully connect wallet and request a loan
   - Mock wallet connection
   - Fill loan request form
   - Submit and verify loan creation

2. **Error Handling**:
   - Wallet not connected error
   - Invalid loan amount validation
   - API error handling

3. **Wallet Management**:
   - Disconnect wallet functionality
   - Wallet state persistence

4. **Loan Details Display**:
   - Verify loan information after creation
   - Check status updates

## Fixtures

### Wallet Fixture (`fixtures/wallet.ts`)

Provides utilities for mocking Stellar wallet interactions:

```typescript
import { test, expect } from './fixtures/wallet';

test('my test', async ({ page, mockWallet, disconnectWallet }) => {
  await mockWallet(page, 'CUSTOM_WALLET_ADDRESS');
  // ... test code
  await disconnectWallet(page);
});
```

### API Mock Helper (`helpers/api-mock.ts`)

Utilities for mocking backend API responses:

```typescript
import { ApiMock } from './helpers/api-mock';

const apiMock = new ApiMock(page);

// Mock user profile
await apiMock.mockUserProfile({
  walletAddress: 'GTEST...',
  kycVerified: true,
});

// Mock loan creation
await apiMock.mockCreateLoan({
  amount: 5000,
  currency: 'USDC',
});

// Mock API errors
await apiMock.mockApiError('/loans', 500, 'Server error');
```

## Writing New Tests

1. Create a new test file in the `e2e/` directory
2. Import the wallet fixture: `import { test, expect } from './fixtures/wallet'`
3. Use the `ApiMock` helper for backend mocking
4. Follow the existing test patterns

Example:
```typescript
import { test, expect } from './fixtures/wallet';
import { ApiMock } from './helpers/api-mock';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    const apiMock = new ApiMock(page);
    await apiMock.mockUserProfile({ kycVerified: true });
  });

  test('should do something', async ({ page, mockWallet }) => {
    await page.goto('/');
    await mockWallet(page);
    // ... test steps
  });
});
```

## Configuration

Test configuration is in `playwright.config.ts`:
- **Base URL**: http://localhost:3000
- **Browsers**: Chromium, Firefox, WebKit
- **Auto-start dev server**: Enabled
- **Retries**: 2 (in CI), 0 (locally)
- **Screenshots**: On failure
- **Traces**: On first retry

## CI/CD Integration

The tests are configured to run in CI environments with:
- Parallel execution disabled in CI
- 2 retry attempts
- HTML reporter for results

## Best Practices

1. **Use semantic selectors**: Prefer `getByRole`, `getByLabel` over CSS selectors
2. **Mock external dependencies**: Always mock wallet and API calls
3. **Wait for stability**: Use `waitForLoadState('networkidle')` when needed
4. **Clean up**: Clear mocks between tests using `beforeEach`
5. **Descriptive test names**: Clearly describe what the test validates
6. **Assertions**: Use specific assertions with meaningful error messages

## Troubleshooting

### Tests timing out
- Increase timeout in test or config
- Check if dev server is running
- Verify network mocks are set up correctly

### Flaky tests
- Add explicit waits for dynamic content
- Use `waitForLoadState` or `waitForSelector`
- Check for race conditions in async operations

### Selector not found
- Verify the UI component exists
- Check if element is visible/enabled
- Use Playwright Inspector: `npm run test:e2e:debug`
