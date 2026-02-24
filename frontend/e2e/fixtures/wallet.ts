import { test as base, Page } from '@playwright/test';

export interface WalletFixture {
  mockWallet: (page: Page, walletAddress?: string) => Promise<void>;
  disconnectWallet: (page: Page) => Promise<void>;
}

export const test = base.extend<WalletFixture>({
  mockWallet: async ({}, use) => {
    const mockWallet = async (page: Page, walletAddress = 'GDEMOWALLETADDRESS123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') => {
      await page.addInitScript((address) => {
        (window as any).mockWalletConnected = true;
        (window as any).mockWalletAddress = address;
        
        (window as any).stellarWallet = {
          isConnected: () => true,
          getPublicKey: () => address,
          connect: async () => ({ publicKey: address }),
          disconnect: async () => {
            (window as any).mockWalletConnected = false;
          },
          signTransaction: async (xdr: string) => xdr,
        };
      }, walletAddress);
    };
    
    await use(mockWallet);
  },

  disconnectWallet: async ({}, use) => {
    const disconnectWallet = async (page: Page) => {
      await page.evaluate(() => {
        if ((window as any).stellarWallet) {
          (window as any).stellarWallet.disconnect();
        }
        (window as any).mockWalletConnected = false;
      });
    };
    
    await use(disconnectWallet);
  },
});

export { expect } from '@playwright/test';
