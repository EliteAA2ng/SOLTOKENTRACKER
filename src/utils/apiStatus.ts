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
        if (result.ok) {
          results.push({
            name: api.name,
            status: 'accessible',
            message: 'API accessible'
          });
        } else if (result.status === 401) {
          results.push({
            name: api.name,
            status: 'auth-required',
            message: 'HTTP 401'
          });
        } else if (result.status === 429) {
          results.push({
            name: api.name,
            status: 'rate-limited',
            message: 'Rate limited'
          });
        } else {
          results.push({
            name: api.name,
            status: 'failed',
            message: `HTTP ${result.status}`
          });
        }
      }
    } catch (error) {
      results.push({
        name: api.name,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Network error'
      });
    }
  }

  return results;
} 