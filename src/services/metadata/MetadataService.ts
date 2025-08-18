import { TokenMetadata } from '../../types';

export class MetadataService {
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (response.status === 429 && attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.delay(waitTime);
          continue;
        }
        return response;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await this.delay(1000 * attempt);
      }
    }
    throw new Error('Max retries exceeded');
  }

  async fetchMetadata(mintAddress: string, decimals: number, supply?: number): Promise<TokenMetadata> {
    let metadata: TokenMetadata = {
      mint: mintAddress,
      name: 'Unknown Token',
      symbol: 'UNKNOWN',
      decimals,
      supply,
    };

    try {
      await this.fetchJupiterMetadata(mintAddress, metadata);
      await this.delay(100);
      
      await this.fetchCoinGeckoMetadata(mintAddress, metadata);
      await this.delay(100);
      
      await this.fetchDexScreenerMetadata(mintAddress, metadata);
      await this.delay(100);
      
      await this.fetchBirdeyeMetadata(mintAddress, metadata);
    } catch (error) {
      console.warn('Some metadata sources failed:', error);
    }

    if (metadata.symbol === 'UNKNOWN') {
      metadata.symbol = mintAddress.slice(0, 8);
    }

    return metadata;
  }

  private async fetchJupiterMetadata(mintAddress: string, metadata: TokenMetadata): Promise<void> {
    try {
      const response = await fetch(`https://token.jup.ag/strict`);
      const tokens = await response.json();
      const tokenInfo = tokens.find((token: any) => token.address === mintAddress);
      
      if (tokenInfo) {
        metadata.name = tokenInfo.name || metadata.name;
        metadata.symbol = tokenInfo.symbol || metadata.symbol;
        metadata.logoURI = tokenInfo.logoURI || metadata.logoURI;
      }
    } catch (error) {
      console.warn('Failed to fetch token metadata from Jupiter:', error);
    }
  }

  private async fetchCoinGeckoMetadata(mintAddress: string, metadata: TokenMetadata): Promise<void> {
    try {
      const response = await this.fetchWithRetry(
        `https://api.coingecko.com/api/v3/coins/solana/contract/${mintAddress}`,
        { headers: { 'Accept': 'application/json' } }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        metadata.name = data.name || metadata.name;
        metadata.symbol = data.symbol?.toUpperCase() || metadata.symbol;
        metadata.logoURI = data.image?.large || data.image?.small || metadata.logoURI;
        metadata.description = data.description?.en || metadata.description;
        metadata.website = data.links?.homepage?.[0] || metadata.website;
        metadata.twitter = data.links?.twitter_screen_name ? 
          `https://twitter.com/${data.links.twitter_screen_name}` : metadata.twitter;
        metadata.telegram = data.links?.telegram_channel_identifier ?
          `https://t.me/${data.links.telegram_channel_identifier}` : metadata.telegram;
        metadata.discord = data.links?.discord || metadata.discord;
        metadata.coingeckoId = data.id;
        metadata.rank = data.market_cap_rank || metadata.rank;
        
        if (data.market_data) {
          metadata.price = data.market_data.current_price?.usd || metadata.price;
          metadata.priceChange24h = data.market_data.price_change_percentage_24h || metadata.priceChange24h;
          metadata.marketCap = data.market_data.market_cap?.usd || metadata.marketCap;
          metadata.volume24h = data.market_data.total_volume?.usd || metadata.volume24h;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch token metadata from CoinGecko:', error);
    }
  }

  private async fetchDexScreenerMetadata(mintAddress: string, metadata: TokenMetadata): Promise<void> {
    try {
      const response = await this.fetchWithRetry(
        `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`,
        {}
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0];
          
          metadata.name = pair.baseToken?.name || metadata.name;
          metadata.symbol = pair.baseToken?.symbol || metadata.symbol;
          metadata.price = parseFloat(pair.priceUsd) || metadata.price;
          metadata.priceChange24h = parseFloat(pair.priceChange?.h24) || metadata.priceChange24h;
          metadata.volume24h = parseFloat(pair.volume?.h24) || metadata.volume24h;
          metadata.marketCap = parseFloat(pair.marketCap) || metadata.marketCap;
          
          if (pair.info) {
            metadata.website = pair.info.website || metadata.website;
            metadata.twitter = pair.info.twitter || metadata.twitter;
            metadata.telegram = pair.info.telegram || metadata.telegram;
            metadata.discord = pair.info.discord || metadata.discord;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch token metadata from DexScreener:', error);
    }
  }

  private async fetchBirdeyeMetadata(mintAddress: string, metadata: TokenMetadata): Promise<void> {
    try {
      const apiKey = (import.meta as any).env?.VITE_BIRDEYE_API_KEY;
      
      if (!apiKey || apiKey === 'demo') {
        console.log('⏭️ Skipping Birdeye API - no valid API key provided');
        return;
      }
      
      const endpoints = [
        `https://public-api.birdeye.so/defi/token_overview?address=${mintAddress}`,
        `https://public-api.birdeye.so/public/price?address=${mintAddress}`,
        `https://public-api.birdeye.so/defi/price?address=${mintAddress}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              'X-API-KEY': apiKey,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.data) {
              const tokenData = data.data;
              
              metadata.name = tokenData.name || metadata.name;
              metadata.symbol = tokenData.symbol || metadata.symbol;
              metadata.logoURI = tokenData.logoURI || metadata.logoURI;
              metadata.price = tokenData.price || metadata.price;
              metadata.priceChange24h = tokenData.priceChange24h || metadata.priceChange24h;
              metadata.marketCap = tokenData.mc || metadata.marketCap;
              metadata.volume24h = tokenData.v24h || metadata.volume24h;
              
              if (tokenData.liquidity) {
                metadata.liquidity = tokenData.liquidity;
              }
              
              console.log('✅ Birdeye token_overview data fetched successfully');
              return;
            }
            
            if (data.data && data.data.value) {
              metadata.price = data.data.value || metadata.price;
              console.log('✅ Birdeye price data fetched successfully');
              return;
            }
            
            if (typeof data === 'number' || (data.price && typeof data.price === 'number')) {
              metadata.price = typeof data === 'number' ? data : data.price;
              console.log('✅ Birdeye direct price data fetched successfully');
              return;
            }
          }
        } catch (endpointError) {
          continue;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch token metadata from Birdeye:', error);
    }
  }
} 