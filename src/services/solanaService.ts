import { Connection, PublicKey, ParsedTransactionWithMeta, TokenBalance } from '@solana/web3.js';
import { DEFAULT_CONFIG } from '../config';
import { TokenTransfer, TokenAccount, TokenMetadata } from '../types';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export class SolanaService {
  private connection: Connection;
  private rpcUrl: string;
  private heliusApiKey?: string;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
    this.heliusApiKey = this.extractHeliusApiKey(rpcUrl);
    this.connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: DEFAULT_CONFIG.rpcTimeout,
    });
  }

  private extractHeliusApiKey(url: string): string | undefined {
    try {
      const u = new URL(url);
      const key = u.searchParams.get('api-key') || u.searchParams.get('apiKey') || undefined;
      return key || undefined;
    } catch {
      return undefined;
    }
  }

  private getHeliusSearchUrl(): string | undefined {
    if (!this.heliusApiKey) return undefined;
    return `https://api.helius.xyz/v0/transactions/?api-key=${this.heliusApiKey}`;
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

      // Try to fetch metadata from Jupiter API (fallback for name/symbol)
      let name = 'Unknown Token';
      let symbol = 'UNKNOWN';
      let logoURI = undefined;

      try {
        const response = await fetch(`https://token.jup.ag/strict`);
        const tokens = await response.json();
        const tokenInfo = tokens.find((token: any) => token.address === mintAddress);
        
        if (tokenInfo) {
          name = tokenInfo.name || name;
          symbol = tokenInfo.symbol || symbol;
          logoURI = tokenInfo.logoURI;
        }
      } catch (error) {
        console.warn('Failed to fetch token metadata from Jupiter:', error);
        // Use mint address as fallback
        symbol = mintAddress.slice(0, 8);
      }

      return {
        mint: mintAddress,
        name,
        symbol,
        decimals,
        logoURI,
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      throw new Error(`Failed to fetch token metadata: ${error}`);
    }
  }

  async getTokenAccounts(walletAddress: string, tokenMint: string): Promise<TokenAccount[]> {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      const response = await this.connection.getParsedTokenAccountsByOwner(walletPubkey, {
        mint: new PublicKey(tokenMint),
      });

      return response.value.map(account => ({
        address: account.pubkey.toString(),
        balance: account.account.data.parsed.info.tokenAmount.uiAmount || 0,
      }));
    } catch (error) {
      console.error('Error fetching token accounts:', error);
      throw new Error(`Failed to fetch token accounts: ${error}`);
    }
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
      console.log(`RPC URL: ${this.rpcUrl}`);
      console.log(`Using Helius: ${this.rpcUrl.includes('helius')}`);

      // Quick connection test
      try {
        const slot = await this.connection.getSlot();
        console.log(`✅ Connection test passed. Current slot: ${slot}`);
      } catch (error) {
        console.error('❌ Connection test failed:', error);
        throw new Error('RPC connection failed');
      }

      const transfers: TokenTransfer[] = [];
      
      if (walletAddress) {
        console.log('🔍 Mode: Wallet-specific analysis');
        const walletTransfers = await this.getWalletTokenTransfers(walletAddress, tokenMint, Math.ceil(lookbackSeconds / 60));
        transfers.push(...walletTransfers);
      } else {
        console.log('🔍 Mode: Token-wide analysis');
        const tokenTransfers = await this.getRecentTokenTransfersBySeconds(tokenMint, lookbackSeconds);
        transfers.push(...tokenTransfers);
      }

      // Remove duplicates and sort by timestamp
      const uniqueTransfers = this.deduplicateTransfers(transfers);
      const sortedTransfers = uniqueTransfers.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log(`📊 RESULTS: Found ${sortedTransfers.length} unique transfers`);
      if (sortedTransfers.length > 0) {
        console.log('✅ Sample transfer:', sortedTransfers[0]);
      } else {
        console.log('❌ No transfers found - this indicates an issue with the detection logic');
      }
      console.log('=== TOKEN TRANSFER ANALYSIS END ===');
      
      return sortedTransfers;
    } catch (error) {
      console.error('❌ ERROR in getTokenTransfers:', error);
      console.log('=== TOKEN TRANSFER ANALYSIS FAILED ===');
      throw new Error(`Failed to fetch token transfers: ${error}`);
    }
  }

  private async getWalletTokenTransfers(
    walletAddress: string, 
    tokenMint: string, 
    lookbackMinutes: number
  ): Promise<TokenTransfer[]> {
    const transfers: TokenTransfer[] = [];
    
    // Get all token accounts for this wallet and mint
    const tokenAccounts = await this.getTokenAccounts(walletAddress, tokenMint);
    console.log(`Found ${tokenAccounts.length} token accounts for wallet`);

    // Get transactions from wallet (signed transactions)
    const walletTransfers = await this.getSignedTransactions(walletAddress, tokenMint, lookbackMinutes);
    transfers.push(...walletTransfers);

    // Get transactions from each token account (including incoming transfers)
    for (const tokenAccount of tokenAccounts) {
      const accountTransfers = await this.getTokenAccountTransactions(
        tokenAccount.address, 
        walletAddress, 
        tokenMint,
        lookbackMinutes
      );
      transfers.push(...accountTransfers);
    }

    return transfers;
  }

  private async getRecentTokenTransfersBySeconds(tokenMint: string, lookbackSeconds: number): Promise<TokenTransfer[]> {
    const cutoffTimeMs = Date.now() - (lookbackSeconds * 1000);

    // Prefer Helius when available
    if (this.rpcUrl.includes('helius')) {
      const helius = await this.getTransfersWithHeliusSearchBySeconds(tokenMint, cutoffTimeMs);
      if (helius.length > 0) return helius;
    }

    // Fallback 2: Scan recent blocks locally (short windows only)
    const scanned = await this.getTransfersByScanningBlocks(tokenMint, cutoffTimeMs);
    if (scanned.length > 0) return scanned;

    // Fallback 3: Standard RPC sampling (best-effort)
    const fallback = await this.getTransfersWithStandardRPC(tokenMint, Math.ceil(lookbackSeconds / 60));
    return fallback;
  }

  private async getTransfersWithHeliusSearchBySeconds(tokenMint: string, cutoffTimeMs: number): Promise<TokenTransfer[]> {
    try {
      console.log('🚀 Using Helius REST search (mints + types)');
      const searchUrl = this.getHeliusSearchUrl();
      if (!searchUrl) throw new Error('No Helius API key found');

      const transfers: TokenTransfer[] = [];
      let before: string | undefined = undefined; // pagination via signature
      let pages = 0;

      while (pages < 5 && transfers.length < 200) {
        const body: any = {
          query: {
            mints: [tokenMint],
            types: ['TOKEN_TRANSFER'],
          },
          options: {
            limit: 200,
            sortOrder: 'desc',
            commitment: 'confirmed',
          },
        };
        if (before) body.before = before;

        const res = await fetch(searchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Helius REST HTTP ${res.status}`);
        const page = await res.json();
        const txs: any[] = Array.isArray(page) ? page : [];
        if (txs.length === 0) break;

        for (const tx of txs) {
          const tsMs = tx.blockTime ? tx.blockTime * 1000 : 0;
          if (tsMs && tsMs < cutoffTimeMs) {
            // Stop early if page already older than cutoff
            pages = 5; // force exit outer loop
            break;
          }
          if (Array.isArray(tx.tokenTransfers)) {
            for (const t of tx.tokenTransfers) {
              if (t.mint !== tokenMint) continue;
              const amount = Number(t.tokenAmount || 0);
              transfers.push({
                signature: tx.signature,
                timestamp: tsMs || Date.now(),
                direction: 'sent',
                amount,
                fromAddress: t.fromUserAccount || t.fromTokenAccount || 'Unknown',
                toAddress: t.toUserAccount || t.toTokenAccount || 'Unknown',
                slot: tx.slot || 0,
              });
            }
          }
        }

        before = txs[txs.length - 1]?.signature;
        pages += 1;
      }

      console.log(`🎯 Helius REST (mints) found ${transfers.length} transfers`);
      return transfers;
    } catch (e) {
      console.warn('Helius REST mint search failed', e);
      return [];
    }
  }

  private async getTransfersWithStandardRPC(tokenMint: string, lookbackMinutes: number): Promise<TokenTransfer[]> {
    try {
      console.log('Using standard RPC for token transfers');
      
      const transfers: TokenTransfer[] = [];
      const cutoffTime = Date.now() - (lookbackMinutes * 60 * 1000);
      
      // Use Connection.getProgramAccounts with proper SPL Token filters
      console.log('Querying token accounts via getProgramAccounts (web3.js)');
      const accounts = await this.connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
        filters: [
          { dataSize: 165 }, // SPL token account size
          { memcmp: { offset: 0, bytes: new PublicKey(tokenMint).toBase58() } }, // mint at offset 0
        ],
      });

      if (!accounts || accounts.length === 0) {
        console.warn('getProgramAccounts returned no accounts for mint');
        return [];
      }

      const accountsToSample = accounts.slice(0, 50); // sample first 50 accounts
      console.log(`Sampling ${accountsToSample.length} token accounts out of ${accounts.length}`);
      
      for (const acc of accountsToSample) {
        try {
          await this.delay(DEFAULT_CONFIG.delayMsBetweenRequests);
          const signatures = await this.connection.getSignaturesForAddress(acc.pubkey, { limit: 25 });
          const selectedSigs = signatures.slice(0, 12);

          for (const sig of selectedSigs) {
            try {
              await this.delay(DEFAULT_CONFIG.delayMsBetweenRequests);
              const transaction = await this.connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
              if (transaction && transaction.blockTime && (transaction.blockTime * 1000) >= cutoffTime) {
                const tokenTransfers = this.parseTransactionForTokenTransfers(transaction, tokenMint);
                if (tokenTransfers.length > 0) transfers.push(...tokenTransfers);
              }
            } catch {}
          }
        } catch {}
        if (transfers.length >= 100) break; // keep it bounded
      }

      console.log(`Standard RPC sampling found ${transfers.length} transfers`);
      return transfers;
    } catch (error) {
      console.error('Error with standard RPC token transfers:', error);
      return [];
    }
  }

  private async getTransfersByScanningBlocks(tokenMint: string, cutoffTimeMs: number): Promise<TokenTransfer[]> {
    try {
      console.log('🧭 Scanning recent blocks for token transfers');
      const transfers: TokenTransfer[] = [];
      const startSlot = await this.connection.getSlot();
      const maxBlocks = 120; // ~couple minutes of history depending on network activity

      for (let i = 0; i < maxBlocks; i++) {
        const slot = startSlot - i;
        try {
          await this.delay(DEFAULT_CONFIG.delayMsBetweenRequests);
          const block = await this.connection.getParsedBlock(slot, {
            maxSupportedTransactionVersion: 0,
          });
          if (!block) continue;

          const blkTimeMs = block.blockTime ? block.blockTime * 1000 : 0;
          if (blkTimeMs && blkTimeMs < cutoffTimeMs) {
            // We've reached older blocks than the cutoff, stop scanning
            break;
          }

          if (!Array.isArray(block.transactions) || block.transactions.length === 0) continue;

          for (const tx of block.transactions) {
            // Build a compatible object for our parser
            const compat = Object.assign({}, tx, { slot, blockTime: block.blockTime }) as unknown as ParsedTransactionWithMeta;
            const parsed = this.parseTransactionForTokenTransfers(compat, tokenMint);
            if (parsed.length > 0) transfers.push(...parsed);
          }

          if (transfers.length >= 200) break;
        } catch (e) {
          // Continue scanning on transient errors
          continue;
        }
      }

      console.log(`🧭 Block scan found ${transfers.length} transfers`);
      return transfers;
    } catch (e) {
      console.warn('Block scanning failed:', e);
      return [];
    }
  }




  private async getSignedTransactions(
    walletAddress: string, 
    tokenMint: string, 
    lookbackMinutes: number
  ): Promise<TokenTransfer[]> {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      const signatures = await this.connection.getSignaturesForAddress(walletPubkey, {
        limit: DEFAULT_CONFIG.maxSignaturesPerQuery,
      });

      const cutoffTime = Date.now() - (lookbackMinutes * 60 * 1000);
      const recentSignatures = signatures.filter(sig => 
        sig.blockTime && (sig.blockTime * 1000) > cutoffTime
      );

      console.log(`Processing ${recentSignatures.length} recent wallet signatures`);

      const transfers: TokenTransfer[] = [];
      const maxTransactions = Math.min(recentSignatures.length, DEFAULT_CONFIG.maxTransactionsToProcess);
      
      for (let i = 0; i < maxTransactions; i++) {
        const sig = recentSignatures[i];
        try {
          await this.delay(DEFAULT_CONFIG.delayMsBetweenRequests);
          
          const transaction = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (transaction) {
            const transfer = this.parseTransactionForTokenTransfer(transaction, walletAddress, tokenMint);
            if (transfer) {
              transfers.push(transfer);
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch transaction ${sig.signature}:`, error);
        }
      }

      return transfers;
    } catch (error) {
      console.error('Error fetching signed transactions:', error);
      return [];
    }
  }

  private async getTokenAccountTransactions(
    tokenAccountAddress: string, 
    walletAddress: string, 
    tokenMint: string,
    lookbackMinutes: number
  ): Promise<TokenTransfer[]> {
    try {
      const tokenAccountPubkey = new PublicKey(tokenAccountAddress);
      const signatures = await this.connection.getSignaturesForAddress(tokenAccountPubkey, {
        limit: DEFAULT_CONFIG.maxSignaturesPerQuery,
      });

      const cutoffTime = Date.now() - (lookbackMinutes * 60 * 1000);
      const recentSignatures = signatures.filter(sig => 
        sig.blockTime && (sig.blockTime * 1000) > cutoffTime
      );

      const transfers: TokenTransfer[] = [];
      const maxTransactions = Math.min(recentSignatures.length, DEFAULT_CONFIG.maxTransactionsToProcess);
      
      for (let i = 0; i < maxTransactions; i++) {
        const sig = recentSignatures[i];
        try {
          await this.delay(DEFAULT_CONFIG.delayMsBetweenRequests);
          
          const transaction = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (transaction) {
            const transfer = this.parseTransactionForTokenTransfer(transaction, walletAddress, tokenMint);
            if (transfer) {
              transfers.push(transfer);
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch transaction ${sig.signature}:`, error);
        }
      }

      return transfers;
    } catch (error) {
      console.error('Error fetching token account transactions:', error);
      return [];
    }
  }

  private parseTransactionForTokenTransfer(
    transaction: ParsedTransactionWithMeta, 
    walletAddress: string, 
    tokenMint: string
  ): TokenTransfer | null {
    if (!transaction.meta || !transaction.blockTime) return null;

    const preBalances = transaction.meta.preTokenBalances || [];
    const postBalances = transaction.meta.postTokenBalances || [];
    
    // Find token balance changes for the specific mint
    const tokenBalanceChanges = this.calculateTokenBalanceChanges(preBalances, postBalances, tokenMint);
    
    if (tokenBalanceChanges.length === 0) return null;

    // Find the wallet's balance change
    const walletBalanceChange = tokenBalanceChanges.find(change => 
      change.owner === walletAddress
    );

    if (!walletBalanceChange || walletBalanceChange.change === 0) return null;

    // Determine counterparty
    const counterparty = this.findCounterparty(tokenBalanceChanges, walletAddress);

    // Get token decimals
    const tokenDecimals = this.getTokenDecimalsFromBalances(preBalances, postBalances, tokenMint);

    return {
      signature: transaction.transaction.signatures[0],
      timestamp: transaction.blockTime * 1000,
      direction: walletBalanceChange.change > 0 ? 'received' : 'sent',
      amount: Math.abs(walletBalanceChange.change) / Math.pow(10, tokenDecimals),
      fromAddress: walletBalanceChange.change > 0 ? (counterparty || 'Unknown') : walletAddress,
      toAddress: walletBalanceChange.change > 0 ? walletAddress : (counterparty || 'Unknown'),
      slot: transaction.slot,
    };
  }

  private parseTransactionForTokenTransfers(
    transaction: ParsedTransactionWithMeta, 
    tokenMint: string
  ): TokenTransfer[] {
    if (!transaction.meta || !transaction.blockTime) return [];

    const preBalances = transaction.meta.preTokenBalances || [];
    const postBalances = transaction.meta.postTokenBalances || [];
    
    // Find all token balance changes for the specific mint
    const tokenBalanceChanges = this.calculateTokenBalanceChanges(preBalances, postBalances, tokenMint);
    
    if (tokenBalanceChanges.length === 0) return [];

    const transfers: TokenTransfer[] = [];
    const tokenDecimals = this.getTokenDecimalsFromBalances(preBalances, postBalances, tokenMint);

    // Group changes into transfer pairs (sender/receiver)
    const senders = tokenBalanceChanges.filter(change => change.change < 0);
    const receivers = tokenBalanceChanges.filter(change => change.change > 0);

    // Create transfers by pairing senders with receivers
    const processedSenders = new Set<string>();
    const processedReceivers = new Set<string>();

    for (const sender of senders) {
      if (processedSenders.has(sender.owner)) continue;
      
      for (const receiver of receivers) {
        if (processedReceivers.has(receiver.owner)) continue;
        
        // Match amounts (allowing for small rounding differences)
        const senderAmount = Math.abs(sender.change);
        const receiverAmount = Math.abs(receiver.change);
        const amountDiff = Math.abs(senderAmount - receiverAmount);
        const tolerance = Math.max(senderAmount, receiverAmount) * 0.001; // 0.1% tolerance
        
        if (amountDiff <= tolerance) {
          transfers.push({
            signature: transaction.transaction.signatures[0],
            timestamp: transaction.blockTime * 1000,
            direction: 'sent', // This will be overridden based on context
            amount: senderAmount / Math.pow(10, tokenDecimals),
            fromAddress: sender.owner,
            toAddress: receiver.owner,
            slot: transaction.slot,
          });
          
          processedSenders.add(sender.owner);
          processedReceivers.add(receiver.owner);
          break;
        }
      }
    }

    return transfers;
  }

  private calculateTokenBalanceChanges(
    preBalances: TokenBalance[], 
    postBalances: TokenBalance[], 
    tokenMint: string
  ) {
    const changes: Array<{ owner: string; change: number; account: string }> = [];
    
    // Create a map of account to pre-balance
    const preBalanceMap = new Map<string, { amount: string; owner?: string }>();
    preBalances.forEach(balance => {
      if (balance.mint === tokenMint) {
        preBalanceMap.set(balance.accountIndex.toString(), {
          amount: balance.uiTokenAmount.amount,
          owner: balance.owner,
        });
      }
    });

    // Calculate changes
    postBalances.forEach(postBalance => {
      if (postBalance.mint === tokenMint) {
        const preBalance = preBalanceMap.get(postBalance.accountIndex.toString());
        const preAmount = preBalance ? parseInt(preBalance.amount) : 0;
        const postAmount = parseInt(postBalance.uiTokenAmount.amount);
        const change = postAmount - preAmount;
        
        if (change !== 0 && postBalance.owner) {
          changes.push({
            owner: postBalance.owner,
            change,
            account: postBalance.accountIndex.toString(),
          });
        }
      }
    });

    return changes;
  }

  private getTokenDecimalsFromBalances(
    preBalances: TokenBalance[], 
    postBalances: TokenBalance[], 
    tokenMint: string
  ): number {
    // Try to get decimals from token balances
    const tokenBalance = [...preBalances, ...postBalances].find(balance => balance.mint === tokenMint);
    return tokenBalance?.uiTokenAmount.decimals ?? 6; // Default to 6 if not found
  }

  private findCounterparty(
    balanceChanges: Array<{ owner: string; change: number; account: string }>, 
    walletAddress: string
  ): string {
    // Find the opposite balance change
    const walletChange = balanceChanges.find(change => change.owner === walletAddress);
    if (!walletChange) return 'Unknown';

    const oppositeChange = balanceChanges.find(change => 
      change.owner !== walletAddress && 
      Math.sign(change.change) !== Math.sign(walletChange.change)
    );

    return oppositeChange?.owner || 'Unknown';
  }

  private deduplicateTransfers(transfers: TokenTransfer[]): TokenTransfer[] {
    const seen = new Set<string>();
    return transfers.filter(transfer => {
      const key = `${transfer.signature}-${transfer.fromAddress}-${transfer.toAddress}-${transfer.amount}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async validateAddress(address: string): Promise<boolean> {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
} 