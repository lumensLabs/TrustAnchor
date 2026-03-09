import { test as base, Page } from '@playwright/test';

interface MockWallet {
  isConnected: () => boolean;
  getPublicKey: () => string;
  connect: () => Promise<{ publicKey: string }>;
  disconnect: () => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
}

interface ExtendedWindow extends Window {
  mockWalletConnected?: boolean;
  mockWalletAddress?: string;
  stellarWallet?: MockWallet;
}

export interface WalletFixture {
  mockWallet: (page: Page, walletAddress?: string) => Promise<void>;
  disconnectWallet: (page: Page) => Promise<void>;
}

export const test = base.extend<WalletFixture>({
  mockWallet: async ({}, setupFixture) => {
    const mockWallet = async (page: Page, walletAddress = 'GDEMOWALLETADDRESS123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') => {
      await page.addInitScript((address) => {
        const extendedWindow = window as ExtendedWindow;
        extendedWindow.mockWalletConnected = true;
        extendedWindow.mockWalletAddress = address;
        
        extendedWindow.stellarWallet = {
          isConnected: () => true,
          getPublicKey: () => address,
          connect: async () => ({ publicKey: address }),
          disconnect: async () => {
            extendedWindow.mockWalletConnected = false;
          },
          signTransaction: async (xdr: string) => xdr,
        };
      }, walletAddress);
    };
    
    await setupFixture(mockWallet);
  },

  disconnectWallet: async ({}, setupFixture) => {
    const disconnectWallet = async (page: Page) => {
      await page.evaluate(() => {
        const extendedWindow = window as ExtendedWindow;
        if (extendedWindow.stellarWallet) {
          extendedWindow.stellarWallet.disconnect();
        }
        extendedWindow.mockWalletConnected = false;
      });
    };
    
    await setupFixture(disconnectWallet);
  },
});

export { expect } from '@playwright/test';
