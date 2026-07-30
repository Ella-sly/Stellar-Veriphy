export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";
export const FUTURENET_PASSPHRASE = "Test SDF Future Network ; October 2022";

export type Network = "testnet" | "mainnet" | "futurenet";

export interface NetworkConfig {
  passphrase: string;
  rpcUrl: string;
}

export function getNetworkConfig(network: Network): NetworkConfig {
  switch (network) {
    case "mainnet":
      return {
        passphrase: MAINNET_PASSPHRASE,
        rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? "https://mainnet.stellar.validationcloud.io/v1/soroban/rpc",
      };
    case "futurenet":
      return {
        passphrase: FUTURENET_PASSPHRASE,
        rpcUrl: process.env.NEXT_PUBLIC_FUTURENET_RPC_URL ?? "https://rpc-futurenet.stellar.org",
      };
    case "testnet":
    default:
      return {
        passphrase: TESTNET_PASSPHRASE,
        rpcUrl: process.env.NEXT_PUBLIC_TESTNET_RPC_URL ?? "https://soroban-testnet.stellar.org",
      };
  }
}

// Contract addresses (environment-variable-backed)
export const CONTRACT_ADDRESSES = {
  oracle: process.env.NEXT_PUBLIC_ORACLE_CONTRACT_ID ?? "",
  provenance: process.env.NEXT_PUBLIC_PROVENANCE_CONTRACT_ID ?? "",
  registry: process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID ?? "",
} as const;
