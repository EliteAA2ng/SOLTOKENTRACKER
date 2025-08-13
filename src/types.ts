export interface TokenTransfer {
  signature: string;
  timestamp: number;
  direction: 'sent' | 'received';
  amount: number;
  fromAddress: string;
  toAddress: string;
  slot: number;
}

export interface TokenAccount {
  address: string;
  balance: number;
}

export interface TokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

export interface WalletData {
  address: string;
  tokenAccounts: TokenAccount[];
  transfers: TokenTransfer[];
}

export interface AppConfig {
  heliusApiKey: string;
  tokenMint: string;
  walletAddress?: string;
  lookbackHours: number;
} 