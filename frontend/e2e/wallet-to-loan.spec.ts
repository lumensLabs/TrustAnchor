import { test, expect } from './fixtures/wallet';
import { ApiMock } from './helpers/api-mock';

test.describe('Connect Wallet -> Request Loan Flow', () => {
  test.beforeEach(async ({ page }) => {
    const apiMock = new ApiMock(page);
    await apiMock.mockUserProfile({
      id: 'test-user-123',
      email: 'borrower@example.com',
      walletAddress: 'GDEMOWALLETADDRESS123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      kycVerified: true,
    });
    await apiMock.mockUserBalance({
      available: 10000,
      locked: 0,
      currency: 'USDC',
    });
    await apiMock.mockLoans([]);
  });

  test('should successfully connect wallet and request a loan', async ({ page, mockWallet }) => {
    await page.goto('/');

    await mockWallet(page, 'GDEMOWALLETADDRESS123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');

    await page.waitForLoadState('networkidle');

    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    await expect(connectButton).toBeVisible();
    await connectButton.click();

    await expect(page.getByText(/GDEMOWALLETADDRESS/i)).toBeVisible({ timeout: 5000 });

    const apiMock = new ApiMock(page);
    await apiMock.mockCreateLoan({
      id: 'loan-test-001',
      amount: 5000,
      currency: 'USDC',
      interestRate: 5.5,
      termDays: 30,
      status: 'pending',
      borrowerId: 'test-user-123',
    });

    const requestLoanButton = page.getByRole('button', { name: /request loan|apply for loan|new loan/i });
    await expect(requestLoanButton).toBeVisible();
    await requestLoanButton.click();

    const amountInput = page.getByLabel(/amount|loan amount/i);
    await expect(amountInput).toBeVisible();
    await amountInput.fill('5000');

    const currencySelect = page.getByLabel(/currency/i);
    if (await currencySelect.isVisible()) {
      await currencySelect.selectOption('USDC');
    }

    const termInput = page.getByLabel(/term|duration|days/i);
    if (await termInput.isVisible()) {
      await termInput.fill('30');
    }

    const submitButton = page.getByRole('button', { name: /submit|request|apply/i });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    await expect(page.getByText(/loan.*submitted|loan.*created|success/i)).toBeVisible({ timeout: 10000 });

    await expect(page.getByText(/loan-test-001|5000|pending/i)).toBeVisible();
  });

  test('should show error when wallet is not connected', async ({ page }) => {
    await page.goto('/');

    const requestLoanButton = page.getByRole('button', { name: /request loan|apply for loan|new loan/i });
    
    if (await requestLoanButton.isVisible()) {
      await requestLoanButton.click();
      await expect(page.getByText(/connect.*wallet|wallet.*required/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should validate loan amount input', async ({ page, mockWallet }) => {
    await page.goto('/');
    await mockWallet(page);
    
    await page.waitForLoadState('networkidle');

    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await page.waitForTimeout(1000);
    }

    const requestLoanButton = page.getByRole('button', { name: /request loan|apply for loan|new loan/i });
    await requestLoanButton.click();

    const amountInput = page.getByLabel(/amount|loan amount/i);
    await amountInput.fill('-100');

    const submitButton = page.getByRole('button', { name: /submit|request|apply/i });
    await submitButton.click();

    await expect(page.getByText(/invalid.*amount|amount.*positive|must be greater/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle API errors gracefully', async ({ page, mockWallet }) => {
    await page.goto('/');
    await mockWallet(page);

    await page.waitForLoadState('networkidle');

    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await page.waitForTimeout(1000);
    }

    const apiMock = new ApiMock(page);
    await apiMock.mockApiError('/loans', 500, 'Failed to create loan');

    const requestLoanButton = page.getByRole('button', { name: /request loan|apply for loan|new loan/i });
    await requestLoanButton.click();

    const amountInput = page.getByLabel(/amount|loan amount/i);
    await amountInput.fill('5000');

    const submitButton = page.getByRole('button', { name: /submit|request|apply/i });
    await submitButton.click();

    await expect(page.getByText(/error|failed|something went wrong/i)).toBeVisible({ timeout: 10000 });
  });

  test('should disconnect wallet successfully', async ({ page, mockWallet, disconnectWallet }) => {
    await page.goto('/');
    await mockWallet(page);

    await page.waitForLoadState('networkidle');

    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.getByText(/GDEMOWALLETADDRESS/i)).toBeVisible();

    const disconnectButton = page.getByRole('button', { name: /disconnect/i });
    await expect(disconnectButton).toBeVisible();
    await disconnectButton.click();

    await disconnectWallet(page);

    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible({ timeout: 5000 });
  });

  test('should display loan details after successful creation', async ({ page, mockWallet }) => {
    await page.goto('/');
    await mockWallet(page);

    await page.waitForLoadState('networkidle');

    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await page.waitForTimeout(1000);
    }

    const apiMock = new ApiMock(page);
    await apiMock.mockCreateLoan({
      id: 'loan-detail-test',
      amount: 7500,
      currency: 'USDC',
      interestRate: 6.0,
      termDays: 60,
      status: 'pending',
    });

    const requestLoanButton = page.getByRole('button', { name: /request loan|apply for loan|new loan/i });
    await requestLoanButton.click();

    const amountInput = page.getByLabel(/amount|loan amount/i);
    await amountInput.fill('7500');

    const submitButton = page.getByRole('button', { name: /submit|request|apply/i });
    await submitButton.click();

    await expect(page.getByText(/7500/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/USDC/)).toBeVisible();
    await expect(page.getByText(/pending/i)).toBeVisible();
  });
});
