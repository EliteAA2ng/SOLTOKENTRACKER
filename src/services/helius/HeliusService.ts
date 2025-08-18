import { TokenTransfer } from '../../types';

export class HeliusService {
  private heliusApiKey?: string;
  private rateLimitCount: number = 0;
  private lastRateLimitTime: number = 0;

  constructor(rpcUrl: string) {
    this.heliusApiKey = this.extractHeliusApiKey(rpcUrl);
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

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
    const now = Date.now();
    if (this.rateLimitCount >= 3 && (now - this.lastRateLimitTime) < 30000) {
      console.warn('🚫 Circuit breaker active: too many rate limits. Waiting 30 seconds...');
      await this.delay(30000);
      this.rateLimitCount = 0;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        if (response.status === 429) {
          this.rateLimitCount++;
          this.lastRateLimitTime = now;
          
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.warn(`🚫 Rate limited (429). Count: ${this.rateLimitCount}. Attempt ${attempt}/${maxRetries}. Waiting ${waitTime}ms...`);
          
          if (attempt < maxRetries) {
            await this.delay(waitTime);
            continue;
          }
        } else if (response.ok) {
          this.rateLimitCount = Math.max(0, this.rateLimitCount - 1);
        }
        
        return response;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await this.delay(1000 * attempt);
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  async searchWalletTransfers(
    walletAddress: string,
    tokenMint: string,
    cutoffTimeMs: number
  ): Promise<TokenTransfer[]> {
    try {
      console.log('🚀 Using Helius to find ALL wallet transfers');
      const searchUrl = this.getHeliusSearchUrl();
      if (!searchUrl) throw new Error('No Helius API key found');

      const transfers: TokenTransfer[] = [];
      let before: string | undefined = undefined;
      let pages = 0;

      while (pages < 10 && transfers.length < 1000) {
        const body: any = {
          query: {
            accounts: [walletAddress],
            mints: [tokenMint],
            types: ['TRANSFER', 'TOKEN_TRANSFER'],
          },
          options: {
            limit: 1000,
            sortOrder: 'desc',
            commitment: 'confirmed',
          },
        };
        if (before) body.before = before;

        const res = await this.fetchWithRetry(searchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        
        if (!res.ok) {
          console.warn(`Helius API error: ${res.status}`);
          break;
        }
        
        const page = await res.json();
        const txs: any[] = Array.isArray(page) ? page : [];
        if (txs.length === 0) break;

        let foundOldTransfer = false;
        for (const tx of txs) {
          const tsMs = tx.blockTime ? tx.blockTime * 1000 : 0;
          
          if (tsMs && tsMs < cutoffTimeMs) {
            foundOldTransfer = true;
            continue;
          }
          
          if (Array.isArray(tx.tokenTransfers)) {
            for (const t of tx.tokenTransfers) {
              if (t.mint !== tokenMint) continue;
              
              const fromUser = t.fromUserAccount;
              const toUser = t.toUserAccount;
              
              if (fromUser !== walletAddress && toUser !== walletAddress) {
                continue;
              }
              
              const hasValidFrom = fromUser || t.fromTokenAccount;
              const hasValidTo = toUser || t.toTokenAccount;
              if (!t.tokenAmount || !hasValidFrom || !hasValidTo) {
                continue;
              }
              
              const amount = Number(t.tokenAmount || 0);
              if (amount <= 0 || isNaN(amount)) continue;
              
              const direction: 'received' | 'sent' = toUser === walletAddress ? 'received' : 'sent';
              
              const transfer: TokenTransfer = {
                signature: tx.signature,
                timestamp: tsMs || Date.now(),
                direction,
                amount,
                fromAddress: fromUser || t.fromTokenAccount || 'Unknown',
                toAddress: toUser || t.toTokenAccount || 'Unknown',
                slot: tx.slot || 0,
              };
              transfers.push(transfer);
            }
          }
        }
        
        if (foundOldTransfer) {
          console.log(`⏹️ Reached cutoff time, stopping search at page ${pages + 1}`);
          break;
        }

        before = txs[txs.length - 1]?.signature;
        pages += 1;
      }

      console.log(`🎯 Helius wallet search found ${transfers.length} transfers`);
      return transfers;
    } catch (e) {
      console.warn('Helius wallet search failed:', e);
      return [];
    }
  }

  async searchTokenWideTransfers(
    tokenMint: string,
    cutoffTimeMs: number
  ): Promise<TokenTransfer[]> {
    try {
      console.log('🚀 Using Helius REST search (comprehensive token-wide)');
      const searchUrl = this.getHeliusSearchUrl();
      if (!searchUrl) throw new Error('No Helius API key found');

      const transfers: TokenTransfer[] = [];
      let before: string | undefined = undefined;
      let pages = 0;
      const maxPages = 10;

      while (pages < maxPages && transfers.length < 2000) {
        const body: any = {
          query: {
            mints: [tokenMint],
            types: ['TRANSFER', 'TOKEN_TRANSFER'],
          },
          options: {
            limit: 1000,
            sortOrder: 'desc',
            commitment: 'confirmed',
          },
        };
        if (before) body.before = before;

        const res = await this.fetchWithRetry(searchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        
        if (!res.ok) {
          console.warn(`Helius API error: ${res.status}`);
          break;
        }
        
        const page = await res.json();
        const txs: any[] = Array.isArray(page) ? page : [];
        if (txs.length === 0) break;

        let foundOldTransfer = false;
        for (const tx of txs) {
          const tsMs = tx.blockTime ? tx.blockTime * 1000 : 0;
          if (tsMs && tsMs < cutoffTimeMs) {
            foundOldTransfer = true;
            continue;
          }
          
          if (Array.isArray(tx.tokenTransfers)) {
            for (const t of tx.tokenTransfers) {
              if (t.mint !== tokenMint) continue;
              
              const hasValidFrom = t.fromUserAccount || t.fromTokenAccount;
              const hasValidTo = t.toUserAccount || t.toTokenAccount;
              if (!t.tokenAmount || !hasValidFrom || !hasValidTo) {
                continue;
              }
              
              const amount = Number(t.tokenAmount || 0);
              if (amount <= 0 || isNaN(amount)) continue;
              
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

        if (foundOldTransfer) {
          console.log(`⏹️ Reached cutoff time, stopping search at page ${pages + 1}`);
          break;
        }

        before = txs[txs.length - 1]?.signature;
        pages += 1;
        
        await this.delay(300);
      }

      console.log(`🎯 Helius REST (comprehensive) found ${transfers.length} transfers in ${pages} pages`);
      return transfers;
    } catch (e) {
      console.warn('Helius REST comprehensive search failed', e);
      return [];
    }
  }

  hasApiKey(): boolean {
    return !!this.heliusApiKey;
  }
} 