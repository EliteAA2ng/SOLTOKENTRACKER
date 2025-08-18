import { ParsedTransactionWithMeta, TokenBalance } from '@solana/web3.js';
import { TokenTransfer } from '../../types';

interface BalanceChange {
  owner: string;
  change: number;
  account: string;
}

export class TransactionParser {
  parseTransactionForTokenTransfers(
    transaction: ParsedTransactionWithMeta, 
    tokenMint: string
  ): TokenTransfer[] {
    if (!transaction.meta) return [];
    
    if (!transaction.transaction?.signatures?.[0]) return [];
    
    const signature = transaction.transaction.signatures[0];
    const blockTime = transaction.blockTime || Math.floor(Date.now() / 1000);

    const preBalances = transaction.meta.preTokenBalances || [];
    const postBalances = transaction.meta.postTokenBalances || [];
    
    const tokenBalanceChanges = this.calculateTokenBalanceChanges(preBalances, postBalances, tokenMint);
    
    if (tokenBalanceChanges.length === 0) return [];
    
    const transfers: TokenTransfer[] = [];
    const tokenDecimals = this.getTokenDecimalsFromBalances(preBalances, postBalances, tokenMint);

    const senders = tokenBalanceChanges.filter(change => change.change < 0);
    const receivers = tokenBalanceChanges.filter(change => change.change > 0);
    
    // Handle 1 sender, multiple receivers
    if (senders.length === 1 && receivers.length > 1) {
      const sender = senders[0];
      
      for (const receiver of receivers) {
        const divisor = Math.pow(10, Math.max(0, tokenDecimals || 0));
        const transferAmount = Math.abs(receiver.change) / divisor;
        
        if (isNaN(transferAmount) || transferAmount <= 0) continue;
        
        transfers.push({
          signature,
          timestamp: blockTime * 1000,
          direction: 'sent',
          amount: transferAmount,
          fromAddress: sender.owner,
          toAddress: receiver.owner,
          slot: transaction.slot || 0,
        });
      }
    }
    // Handle multiple senders, 1 receiver
    else if (senders.length > 1 && receivers.length === 1) {
      const receiver = receivers[0];
      
      for (const sender of senders) {
        const divisor = Math.pow(10, Math.max(0, tokenDecimals || 0));
        const transferAmount = Math.abs(sender.change) / divisor;
        
        if (isNaN(transferAmount) || transferAmount <= 0) continue;
        
        transfers.push({
          signature,
          timestamp: blockTime * 1000,
          direction: 'received',
          amount: transferAmount,
          fromAddress: sender.owner,
          toAddress: receiver.owner,
          slot: transaction.slot || 0,
        });
      }
    }
    // Fallback: create transfers for all balance changes
    else {
      for (const change of tokenBalanceChanges) {
        const divisor = Math.pow(10, Math.max(0, tokenDecimals || 0));
        const transferAmount = Math.abs(change.change) / divisor;
        
        if (isNaN(transferAmount) || transferAmount <= 0) continue;
        
        const isReceived = change.change > 0;
        const direction = isReceived ? 'received' : 'sent';
        const fromAddress = isReceived ? 'Unknown' : change.owner;
        const toAddress = isReceived ? change.owner : 'Unknown';
        
        transfers.push({
          signature,
          timestamp: blockTime * 1000,
          direction,
          amount: transferAmount,
          fromAddress,
          toAddress,
          slot: transaction.slot || 0,
        });
      }
    }
    return transfers;
  }

  private calculateTokenBalanceChanges(
    preBalances: TokenBalance[], 
    postBalances: TokenBalance[], 
    tokenMint: string
  ): BalanceChange[] {
    const changes: BalanceChange[] = [];
    
    const preBalanceMap = new Map<string, { amount: string; owner?: string }>();
    preBalances.forEach(balance => {
      if (balance.mint === tokenMint) {
        preBalanceMap.set(balance.accountIndex.toString(), {
          amount: balance.uiTokenAmount.amount,
          owner: balance.owner,
        });
      }
    });

    postBalances.forEach(postBalance => {
      if (postBalance.mint === tokenMint && postBalance.owner) {
        const preBalance = preBalanceMap.get(postBalance.accountIndex.toString());
        const preAmount = preBalance ? parseInt(preBalance.amount) : 0;
        const postAmount = parseInt(postBalance.uiTokenAmount.amount);
        const change = postAmount - preAmount;
        
        if (change !== 0) {
          changes.push({
            owner: postBalance.owner,
            change,
            account: postBalance.accountIndex.toString(),
          });
        }
      }
    });

    // Check for accounts that were emptied
    preBalances.forEach(preBalance => {
      if (preBalance.mint === tokenMint && preBalance.owner) {
        const hasPostBalance = postBalances.some(
          pb => pb.accountIndex === preBalance.accountIndex && pb.mint === tokenMint
        );
        
        if (!hasPostBalance) {
          const preAmount = parseInt(preBalance.uiTokenAmount.amount);
          if (preAmount > 0) {
            changes.push({
              owner: preBalance.owner,
              change: -preAmount,
              account: preBalance.accountIndex.toString(),
            });
          }
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
    const tokenBalance = [...preBalances, ...postBalances].find(balance => 
      balance.mint === tokenMint && balance.uiTokenAmount.decimals !== null
    );
    
    if (tokenBalance?.uiTokenAmount.decimals !== undefined) {
      return tokenBalance.uiTokenAmount.decimals;
    }
    
    const commonDecimals: { [key: string]: number } = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6, // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6, // USDT  
      'So11111111111111111111111111111111111111112': 9, // SOL
      'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn': 6, // PUMP
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 5, // BONK
    };
    
    return commonDecimals[tokenMint] || 6;
  }
} 