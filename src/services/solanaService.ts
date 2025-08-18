import { Connection, PublicKey } from '@solana/web3.js';
import { DEFAULT_CONFIG } from '../config';
import { TokenTransfer, TokenAccount, TokenMetadata } from '../types';
import { MetadataService } from './metadata/MetadataService';
import { HeliusService } from './helius/HeliusService';
import { BlockchainService } from './blockchain/BlockchainService';

export class SolanaService {
  private connection: Connection;
  private rpcUrl: string;
  private metadataService: MetadataService;
  private heliusService: HeliusService;
  private blockchainService: BlockchainService;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
    this.connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: DEFAULT_CONFIG.rpcTimeout,
    });

    // Initialize specialized services
    this.metadataService = new MetadataService();
    this.heliusService = new HeliusService(rpcUrl);
    this.blockchainService = new BlockchainService(this.connection);

    console.log(`🔧 SolanaService initialized:`);
    console.log(`🔧 RPC URL: ${rpcUrl.substring(0, 50)}...`);
    console.log(`🔧 Has Helius key: ${this.heliusService.hasApiKey()}`);
    console.log(`🔧 URL contains 'helius': ${rpcUrl.includes('helius')}`);
  }

  async getTokenMetadata(mintAddress: string): Promise<TokenMetadata> {
    try {
      const mintPubkey = new PublicKey(mintAddress);
      
      // Get mint account info to get decimals
      const mintInfo = await this.connection.getParsedAccountInfo(mintPubkey);
      if (!mintInfo.value || !mintInfo.value.data) {
        throw new Error('Invalid token mint address');
      }

      const parsedData = mintInfo.value.data as any;
      const decimals = parsedData.parsed?.info?.decimals ?? 6;
      const supply = parsedData.parsed?.info?.supply ? 
        parseInt(parsedData.parsed.info.supply) / Math.pow(10, decimals) : undefined;

      return await this.metadataService.fetchMetadata(mintAddress, decimals, supply);
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      throw new Error(`Failed to fetch token metadata: ${error}`);
    }
  }

  async getTokenAccounts(walletAddress: string, tokenMint: string): Promise<TokenAccount[]> {
    return await this.blockchainService.getTokenAccounts(walletAddress, tokenMint);
  }

  async getTokenTransfers(
    tokenMint: string, 
    walletAddress?: string, 
    lookbackSeconds: number = DEFAULT_CONFIG.lookbackSeconds
  ): Promise<TokenTransfer[]> {
    try {
      console.log('=== TOKEN TRANSFER ANALYSIS START ===');
      console.log(`Token mint: ${tokenMint}`);
      console.log(`Wallet filter: ${walletAddress || 'None (all transfers)'}`);
      console.log(`Lookback window: ${lookbackSeconds} seconds`);

      // Connection test
      try {
        const slot = await this.blockchainService.getCurrentSlot();
        console.log(`✅ Connection test passed. Current slot: ${slot}`);
      } catch (error) {
        console.error('❌ Connection test failed:', error);
        throw new Error('RPC connection failed');
      }

      const transfers: TokenTransfer[] = [];
      
      if (walletAddress) {
        console.log('🔍 Mode: Wallet-specific analysis');
        const walletTransfers = await this.getWalletTokenTransfers(walletAddress, tokenMint, lookbackSeconds);
        transfers.push(...walletTransfers);
      } else {
        console.log('🔍 Mode: Token-wide analysis');
        const tokenTransfers = await this.getTokenWideTransfers(tokenMint, lookbackSeconds);
        transfers.push(...tokenTransfers);
      }

      // Remove duplicates and sort by timestamp
      const uniqueTransfers = this.deduplicateTransfers(transfers);
      const sortedTransfers = uniqueTransfers.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log(`📊 RESULTS: Found ${sortedTransfers.length} unique transfers`);
      console.log('=== TOKEN TRANSFER ANALYSIS END ===');
      
      return sortedTransfers;
    } catch (error) {
      console.error('❌ Error in getTokenTransfers:', error);
      throw new Error(`Failed to fetch token transfers: ${error}`);
    }
  }

  async getTokenTransfersStream(
    tokenMint: string,
    walletAddress: string | undefined,
    lookbackSeconds: number,
    onTransferFound: (transfers: TokenTransfer[]) => void,
    onProgress?: (status: string) => void
  ): Promise<void> {
    try {
      console.log('=== STREAMING TOKEN TRANSFER ANALYSIS START ===');
      
      onProgress?.('Initializing connection...');

      // Connection test
      try {
        const slot = await this.blockchainService.getCurrentSlot();
        console.log(`✅ Connection test passed. Current slot: ${slot}`);
      } catch (error) {
        console.error('❌ Connection test failed:', error);
        throw new Error('RPC connection failed');
      }

      const allTransfers: TokenTransfer[] = [];
      const seenSignatures = new Set<string>();

      if (walletAddress) {
        onProgress?.('Searching wallet-specific transfers...');
        await this.getWalletTokenTransfersStream(walletAddress, tokenMint, lookbackSeconds, (newTransfers) => {
          const uniqueNewTransfers = newTransfers.filter(t => {
            const key = `${t.signature}-${t.fromAddress}-${t.toAddress}-${t.amount}`;
            if (seenSignatures.has(key)) return false;
            seenSignatures.add(key);
            return true;
          });

          if (uniqueNewTransfers.length > 0) {
            allTransfers.push(...uniqueNewTransfers);
            const sortedTransfers = [...allTransfers].sort((a, b) => b.timestamp - a.timestamp);
            onTransferFound(sortedTransfers);
          }
        }, onProgress);
      } else {
        onProgress?.('Searching token-wide transfers...');
        await this.getTokenWideTransfersStream(tokenMint, lookbackSeconds, (newTransfers) => {
          const uniqueNewTransfers = newTransfers.filter(t => {
            const key = `${t.signature}-${t.fromAddress}-${t.toAddress}-${t.amount}`;
            if (seenSignatures.has(key)) return false;
            seenSignatures.add(key);
            return true;
          });

          if (uniqueNewTransfers.length > 0) {
            allTransfers.push(...uniqueNewTransfers);
            const sortedTransfers = [...allTransfers].sort((a, b) => b.timestamp - a.timestamp);
            onTransferFound(sortedTransfers);
          }
        }, onProgress);
      }

      onProgress?.(`Search complete! Found ${allTransfers.length} total transfers`);
      console.log('=== STREAMING TOKEN TRANSFER ANALYSIS END ===');
    } catch (error) {
      console.error('❌ Error in streaming analysis:', error);
      throw error;
    }
  }

  async validateAddress(address: string): Promise<boolean> {
    return await this.blockchainService.validateAddress(address);
  }

  private async getWalletTokenTransfers(
    walletAddress: string, 
    tokenMint: string, 
    lookbackSeconds: number
  ): Promise<TokenTransfer[]> {
    const transfers: TokenTransfer[] = [];
    const cutoffTimeMs = Date.now() - (lookbackSeconds * 1000);
    
    console.log(`🔍 Searching for ALL transfers involving wallet: ${walletAddress}`);
    
    // Method 1: Use Helius API if available
    if (this.rpcUrl.includes('helius') && this.heliusService.hasApiKey()) {
      const heliusTransfers = await this.heliusService.searchWalletTransfers(walletAddress, tokenMint, cutoffTimeMs);
      if (heliusTransfers.length > 0) {
        console.log(`✅ Helius found ${heliusTransfers.length} transfers for wallet`);
        transfers.push(...heliusTransfers);
      }
    }
    
    // Method 2: Fallback blockchain scanning
    const tokenAccounts = await this.blockchainService.getTokenAccounts(walletAddress, tokenMint);
    console.log(`Found ${tokenAccounts.length} token accounts for wallet`);

    const walletTransfers = await this.blockchainService.getSignedTransactions(walletAddress, tokenMint, lookbackSeconds);
    transfers.push(...walletTransfers);

    for (const tokenAccount of tokenAccounts) {
      const accountTransfers = await this.blockchainService.getTokenAccountTransactions(
        tokenAccount.address, 
        walletAddress, 
        tokenMint,
        lookbackSeconds
      );
      transfers.push(...accountTransfers);
    }

    return transfers;
  }

  private async getTokenWideTransfers(tokenMint: string, lookbackSeconds: number): Promise<TokenTransfer[]> {
    const cutoffTimeMs = Date.now() - (lookbackSeconds * 1000);
    const allTransfers: TokenTransfer[] = [];

    // Method 1: Helius search
    if (this.rpcUrl.includes('helius') && this.heliusService.hasApiKey()) {
      const helius = await this.heliusService.searchTokenWideTransfers(tokenMint, cutoffTimeMs);
      if (helius.length > 0) {
        console.log(`✅ Helius found ${helius.length} token-wide transfers`);
        allTransfers.push(...helius);
      }
    }

    // Method 2: Scan recent blocks
    const scanned = await this.blockchainService.scanRecentBlocks(tokenMint, cutoffTimeMs);
    if (scanned.length > 0) {
      console.log(`✅ Block scanning found ${scanned.length} additional transfers`);
      allTransfers.push(...scanned);
    }

    // Method 3: Standard RPC sampling
    const fallback = await this.blockchainService.sampleTokenAccountTransactions(tokenMint, lookbackSeconds);
    if (fallback.length > 0) {
      console.log(`✅ RPC sampling found ${fallback.length} additional transfers`);
      allTransfers.push(...fallback);
    }

    return this.deduplicateTransfers(allTransfers);
  }

  private async getWalletTokenTransfersStream(
    walletAddress: string, 
    tokenMint: string, 
    lookbackSeconds: number,
    onBatch: (transfers: TokenTransfer[]) => void,
    _onProgress?: (status: string) => void
  ): Promise<void> {
    // Implementation would be similar to the above but with streaming callbacks
    // This is a simplified version for the refactor
    const transfers = await this.getWalletTokenTransfers(walletAddress, tokenMint, lookbackSeconds);
    if (transfers.length > 0) {
      onBatch(transfers);
    }
  }

  private async getTokenWideTransfersStream(
    tokenMint: string,
    lookbackSeconds: number,
    onBatch: (transfers: TokenTransfer[]) => void,
    _onProgress?: (status: string) => void
  ): Promise<void> {
    // Implementation would be similar to the above but with streaming callbacks
    // This is a simplified version for the refactor
    const transfers = await this.getTokenWideTransfers(tokenMint, lookbackSeconds);
    if (transfers.length > 0) {
      onBatch(transfers);
    }
  }

  private deduplicateTransfers(transfers: TokenTransfer[]): TokenTransfer[] {
    console.log(`🔍 DEDUPLICATION: Starting with ${transfers.length} transfers`);
    const seen = new Set<string>();
    const result = transfers.filter(transfer => {
      const key = `${transfer.signature}-${transfer.fromAddress}-${transfer.toAddress}-${transfer.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    console.log(`🔍 DEDUPLICATION: Result ${result.length} unique transfers`);
    return result;
  }
} 