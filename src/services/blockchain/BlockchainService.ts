import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TokenTransfer, TokenAccount } from '../../types';
import { DEFAULT_CONFIG } from '../../config';
import { TransactionParser } from '../parser/TransactionParser';

export class BlockchainService {
  private connection: Connection;
  private parser: TransactionParser;

  constructor(connection: Connection) {
    this.connection = connection;
    this.parser = new TransactionParser();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  async getSignedTransactions(
    walletAddress: string, 
    tokenMint: string, 
    lookbackSeconds: number
  ): Promise<TokenTransfer[]> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(walletAddress),
        { limit: 1000 },
        'confirmed'
      );

      const cutoffTime = Date.now() - (lookbackSeconds * 1000);
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
            const tokenTransfers = this.parser.parseTransactionForTokenTransfers(transaction, tokenMint);
            const walletTransfers = tokenTransfers.filter(t => 
              t.fromAddress === walletAddress || t.toAddress === walletAddress
            );
            transfers.push(...walletTransfers);
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

  async getTokenAccountTransactions(
    tokenAccountAddress: string, 
    walletAddress: string, 
    tokenMint: string,
    lookbackSeconds: number
  ): Promise<TokenTransfer[]> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(tokenAccountAddress),
        { limit: 1000 },
        'confirmed'
      );

      const cutoffTime = Date.now() - (lookbackSeconds * 1000);
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
            const tokenTransfers = this.parser.parseTransactionForTokenTransfers(transaction, tokenMint);
            const walletTransfers = tokenTransfers.filter(t => 
              t.fromAddress === walletAddress || t.toAddress === walletAddress
            );
            transfers.push(...walletTransfers);
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

  async scanRecentBlocks(tokenMint: string, cutoffTimeMs: number): Promise<TokenTransfer[]> {
    try {
      console.log('🧭 Scanning recent blocks for token transfers');
      const transfers: TokenTransfer[] = [];
      const startSlot = await this.connection.getSlot();
      const maxBlocks = 120;
      
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
            break;
          }

          if (!Array.isArray(block.transactions) || block.transactions.length === 0) continue;

          for (const tx of block.transactions) {
            const compat = Object.assign({}, tx, { slot, blockTime: block.blockTime }) as unknown as ParsedTransactionWithMeta;
            const parsed = this.parser.parseTransactionForTokenTransfers(compat, tokenMint);
            if (parsed.length > 0) transfers.push(...parsed);
          }

          if (transfers.length >= 200) break;
        } catch (e) {
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

  async sampleTokenAccountTransactions(tokenMint: string, lookbackSeconds: number): Promise<TokenTransfer[]> {
    try {
      console.log('🔧 Using standard RPC for comprehensive token transfers');
      
      const transfers: TokenTransfer[] = [];
      const cutoffTime = Date.now() - (lookbackSeconds * 1000);
      
      console.log('📡 Querying ALL token accounts via getProgramAccounts');
      const accounts = await this.connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
        filters: [
          { dataSize: 165 },
          { memcmp: { offset: 0, bytes: tokenMint } },
        ],
      });

      if (!accounts || accounts.length === 0) {
        console.warn('❌ getProgramAccounts returned no accounts for mint');
        return [];
      }

      const totalAccounts = accounts.length;
      const maxAccountsToSample = Math.min(100, totalAccounts);
      
      const accountsToSample = totalAccounts <= maxAccountsToSample 
        ? accounts 
        : (() => {
            const sampled = [];
            const step = totalAccounts / maxAccountsToSample;
            for (let i = 0; i < maxAccountsToSample; i++) {
              const index = Math.floor(i * step);
              sampled.push(accounts[index]);
            }
            return sampled;
          })();
      
      console.log(`📊 Sampling ${accountsToSample.length} token accounts out of ${totalAccounts} total`);
      
      let processedAccounts = 0;
      for (const acc of accountsToSample) {
        try {
          await this.delay(DEFAULT_CONFIG.delayMsBetweenRequests);
          const signatures = await this.connection.getSignaturesForAddress(acc.pubkey, { 
            limit: 50
          });
          
          const selectedSigs = signatures.slice(0, 50);

          for (const sig of selectedSigs) {
            try {
              await this.delay(DEFAULT_CONFIG.delayMsBetweenRequests);
              const transaction = await this.connection.getParsedTransaction(sig.signature, { 
                maxSupportedTransactionVersion: 0 
              });
              
              if (transaction && transaction.blockTime && (transaction.blockTime * 1000) >= cutoffTime) {
                const tokenTransfers = this.parser.parseTransactionForTokenTransfers(transaction, tokenMint);
                if (tokenTransfers.length > 0) {
                  transfers.push(...tokenTransfers);
                }
              }
            } catch (txError) {
              continue;
            }
          }
          
          processedAccounts++;
          if (processedAccounts % 10 === 0) {
            console.log(`📈 Processed ${processedAccounts}/${accountsToSample.length} accounts, found ${transfers.length} transfers so far`);
          }
          
        } catch (accError) {
          continue;
        }
        
        if (transfers.length >= 500) break;
      }

      console.log(`🎯 Standard RPC comprehensive sampling found ${transfers.length} transfers from ${processedAccounts} accounts`);
      return transfers;
    } catch (error) {
      console.error('❌ Error with standard RPC comprehensive token transfers:', error);
      return [];
    }
  }

  async validateAddress(address: string): Promise<boolean> {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentSlot(): Promise<number> {
    return await this.connection.getSlot();
  }
} 