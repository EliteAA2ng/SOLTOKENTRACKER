export interface ApiStatus {
  name: string;
  status: 'accessible' | 'failed' | 'rate-limited' | 'auth-required';
  message: string;
}

export async function checkApiStatus(): Promise<ApiStatus[]> {
  const apis = [
    {
      name: 'Jupiter',
      url: 'https://token.jup.ag/strict',
      testFn: async () => {
        const response = await fetch('https://token.jup.ag/strict');
        return response.ok;
      }
    },
    {
      name: 'CoinGecko',
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      testFn: async () => {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        return response.ok;
      }
    },
    {
      name: 'DexScreener',
      url: 'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112',
      testFn: async () => {
        const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
        return response.ok;
      }
    },
    {
      name: 'Birdeye',
      url: 'https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=50',
      testFn: async () => {
        const response = await fetch('https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=50', {
          headers: {
            'X-API-KEY': 'demo' // Using demo key for status check
          }
        });
        return response.ok;
      }
    }
  ];

  const results: ApiStatus[] = [];

  for (const api of apis) {
    try {
      const result = await Promise.race([
        api.testFn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]) as any;

      if (typeof result === 'boolean') {
        results.push({
          name: api.name,
          status: result ? 'accessible' : 'failed',
          message: result ? 'API accessible' : 'API failed'
        });
      } else if (typeof result === 'object' && result.status) {
        results.push({
          name: api.name,
          status: result.status,
          message: result.message
        });
      }
    } catch (error) {
      let status: ApiStatus['status'] = 'failed';
      let message = 'API failed';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          status = 'failed';
          message = 'Request timeout';
        } else if (error.message.includes('429')) {
          status = 'rate-limited';
          message = 'Rate limited';
        } else if (error.message.includes('401') || error.message.includes('403')) {
          status = 'auth-required';
          message = 'Authentication required';
        }
      }
      
      results.push({
        name: api.name,
        status,
        message
      });
    }
  }

  return results;
} 