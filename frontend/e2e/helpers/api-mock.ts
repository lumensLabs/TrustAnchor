import { Page, Route } from '@playwright/test';

export interface MockApiOptions {
  baseUrl?: string;
}

interface Loan {
  id?: string;
  amount?: number;
  currency?: string;
  interestRate?: number;
  termDays?: number;
  status?: string;
  borrowerId?: string;
  createdAt?: string;
}

export class ApiMock {
  private page: Page;
  private baseUrl: string;

  constructor(page: Page, options: MockApiOptions = {}) {
    this.page = page;
    this.baseUrl = options.baseUrl || 'http://localhost:3001';
  }

  async mockUserProfile(profile: {
    id?: string;
    email?: string;
    walletAddress?: string;
    kycVerified?: boolean;
  }) {
    await this.page.route(`${this.baseUrl}/user/profile`, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: profile.id || 'user-123',
          email: profile.email || 'test@example.com',
          walletAddress: profile.walletAddress || 'GDEMOWALLETADDRESS123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
          kycVerified: profile.kycVerified ?? true,
        }),
      });
    });
  }

  async mockUserBalance(balance: {
    available?: number;
    locked?: number;
    currency?: string;
  }) {
    await this.page.route(`${this.baseUrl}/user/balance`, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: balance.available || 10000,
          locked: balance.locked || 0,
          currency: balance.currency || 'USDC',
        }),
      });
    });
  }

  async mockCreateLoan(response?: {
    id?: string;
    amount?: number;
    currency?: string;
    interestRate?: number;
    termDays?: number;
    status?: string;
    borrowerId?: string;
    createdAt?: string;
  }) {
    await this.page.route(`${this.baseUrl}/loans`, async (route: Route) => {
      if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: response?.id || 'loan-' + Date.now(),
            amount: requestBody.amount || response?.amount || 1000,
            currency: requestBody.currency || response?.currency || 'USDC',
            interestRate: requestBody.interestRate || response?.interestRate || 5.5,
            termDays: requestBody.termDays || response?.termDays || 30,
            status: response?.status || 'pending',
            borrowerId: requestBody.borrowerId || response?.borrowerId || 'user-123',
            createdAt: response?.createdAt || new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockLoans(loans: Loan[] = []) {
    await this.page.route(`${this.baseUrl}/loans`, async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(loans),
        });
      } else {
        await route.continue();
      }
    });
  }

  async mockApiError(endpoint: string, statusCode: number = 500, message: string = 'Internal Server Error') {
    await this.page.route(`${this.baseUrl}${endpoint}`, async (route: Route) => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({ message }),
      });
    });
  }

  async clearMocks() {
    await this.page.unrouteAll({ behavior: 'ignoreErrors' });
  }
}
