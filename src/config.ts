// Common token addresses for reference
export const COMMON_TOKENS = {
	USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
	USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
	SOL: 'So11111111111111111111111111111111111111112',
	BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
	JITO: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
	RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
	JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
} as const;

export const DEFAULT_CONFIG = {
	lookbackSeconds: 600, // default window in seconds (10 minutes for better UX)
	delayMsBetweenRequests: 50,
	maxRetries: 3,
	rpcTimeout: 30000,
	maxSignaturesPerQuery: 1000,
	maxTransactionsToProcess: 150,
};

export const getHeliusRpcUrl = (apiKey: string): string => {
	return `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
};

export const PUBLIC_RPC_URL = 'https://api.mainnet-beta.solana.com'; 