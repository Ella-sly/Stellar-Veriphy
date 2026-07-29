import {
  getAddress,
  getNetworkDetails,
  isConnected,
  signTransaction,
} from "@stellar/freighter-api";

export const FREIGHTER_INSTALL_URL =
  "https://chromewebstore.google.com/detail/freighter/bcacfldlkkdogcffnhejadgmjllaphlm";

export interface WalletService {
  isFreighterInstalled(): Promise<boolean>;
  requestFreighterAccess(): Promise<string>;
  getFreighterAddress(): Promise<string>;
  getFreighterNetworkDetails(): Promise<{
    network: string;
    networkUrl: string;
    networkPassphrase: string;
    sorobanRpcUrl?: string;
  }>;
  signTransaction(
    xdr: string,
    networkPassphrase: string,
    address: string
  ): Promise<string>;
}

const mockWalletService: WalletService = {
  async isFreighterInstalled() {
    return true;
  },
  async requestFreighterAccess() {
    return "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ";
  },
  async getFreighterAddress() {
    return "GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNSOLXAUJVLVWXVVNQNYWGLZ";
  },
  async getFreighterNetworkDetails() {
    return {
      network: "testnet",
      networkUrl: "https://horizon-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    };
  },
  async signTransaction(xdr: string) {
    return xdr;
  },
};

const realWalletService: WalletService = {
  async isFreighterInstalled() {
    return await isConnected().then((res) => res.isConnected);
  },
  async requestFreighterAccess() {
    const { address, error } = await getAddress();
    if (error) throw new Error(error.message);
    return address;
  },
  async getFreighterAddress() {
    const { address, error } = await getAddress();
    if (error) throw new Error(error.message);
    return address;
  },
  async getFreighterNetworkDetails() {
    const res = await getNetworkDetails();
    if (res.error) throw new Error(res.error.message);
    return {
      network: res.network,
      networkUrl: res.networkUrl,
      networkPassphrase: res.networkPassphrase,
      sorobanRpcUrl: res.sorobanRpcUrl,
    };
  },
  async signTransaction(xdr: string, networkPassphrase: string, address: string) {
    const { signedTxXdr, error } = await signTransaction(xdr, {
      networkPassphrase,
      address,
    });
    if (error) throw new Error(error.message);
    return signedTxXdr;
  },
};

export function createWalletService(useMock: boolean): WalletService {
  return useMock ? mockWalletService : realWalletService;
}

const useMock = process.env.NEXT_PUBLIC_MOCK_WALLET === "true";
export const walletService = createWalletService(useMock);
