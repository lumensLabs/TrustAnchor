export interface FreighterClient {
  isConnected?: () => Promise<boolean>;
  requestAccess?: () => Promise<string>;
  getPublicKey?: () => Promise<string>;
}

export interface WalletConnector {
  id: "freighter";
  name: string;
  connect: () => Promise<string>;
  getPublicKey: () => Promise<string>;
  isConnected: () => Promise<boolean>;
}

function resolveFreighterClient(): FreighterClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  const candidate = (window as Window & { freighter?: FreighterClient }).freighter;
  return candidate ?? null;
}

function ensureClient(): FreighterClient {
  const client = resolveFreighterClient();

  if (!client) {
    throw new Error(
      "Freighter wallet was not found. Install Freighter to continue."
    );
  }

  if (!client.requestAccess || !client.getPublicKey || !client.isConnected) {
    throw new Error("Freighter wallet API is unavailable in this browser context.");
  }

  return client;
}

export const freighterConnector: WalletConnector = {
  id: "freighter",
  name: "Freighter (Soroban)",
  async connect() {
    const client = ensureClient();
    const publicKey = await client.requestAccess!();

    if (!publicKey) {
      throw new Error("Wallet connection was rejected.");
    }

    return publicKey;
  },
  async getPublicKey() {
    const client = ensureClient();
    return client.getPublicKey!();
  },
  async isConnected() {
    const client = ensureClient();
    return client.isConnected!();
  },
};

export const sorobanConnectors = [freighterConnector] as const;
