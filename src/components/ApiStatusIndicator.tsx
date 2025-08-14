import { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface ApiStatus {
  name: string;
  status: 'checking' | 'success' | 'failed' | 'unknown';
  message?: string;
}

export function ApiStatusIndicator() {
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([
    { name: 'Jupiter', status: 'unknown' },
    { name: 'CoinGecko', status: 'unknown' },
    { name: 'Birdeye', status: 'unknown' },
    { name: 'DexScreener', status: 'unknown' }
  ]);

  const [isVisible, setIsVisible] = useState(false);

  const checkApiStatus = async () => {
    setIsVisible(true);
    const newStatuses = [...apiStatuses];

    // Test each API
    const tests = [
      {
        name: 'Jupiter',
        test: () => fetch('https://token.jup.ag/strict', { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        })
      },
      {
        name: 'CoinGecko',
        test: () => fetch('https://api.coingecko.com/api/v3/ping', {
          signal: AbortSignal.timeout(5000)
        })
      },
      {
        name: 'Birdeye',
        test: () => fetch('https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=1', {
          headers: { 'X-API-KEY': 'public' },
          signal: AbortSignal.timeout(5000)
        })
      },
      {
        name: 'DexScreener',
        test: () => fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112', {
          signal: AbortSignal.timeout(5000)
        })
      }
    ];

    for (let i = 0; i < tests.length; i++) {
      const { name, test } = tests[i];
      newStatuses[i] = { ...newStatuses[i], status: 'checking' };
      setApiStatuses([...newStatuses]);

      try {
        const response = await test();
        if (response.ok) {
          newStatuses[i] = { name, status: 'success', message: 'API accessible' };
        } else {
          newStatuses[i] = { name, status: 'failed', message: `HTTP ${response.status}` };
        }
      } catch (error) {
        newStatuses[i] = { 
          name, 
          status: 'failed', 
          message: error instanceof Error ? error.message : 'Network error'
        };
      }
      setApiStatuses([...newStatuses]);
    }

    // Auto-hide after 10 seconds
    setTimeout(() => setIsVisible(false), 10000);
  };

  const getStatusIcon = (status: ApiStatus['status']) => {
    switch (status) {
      case 'checking':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={checkApiStatus}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors text-sm font-medium z-50"
      >
        Check API Status
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-50 w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900">API Status Check</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-slate-600 text-sm"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        {apiStatuses.map((api) => (
          <div key={api.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(api.status)}
              <span className="text-sm font-medium text-slate-700">{api.name}</span>
            </div>
            {api.message && (
              <span className="text-xs text-slate-500 max-w-32 truncate" title={api.message}>
                {api.message}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          If APIs show as failed, try using a VPN or different network. Some corporate firewalls block these endpoints.
        </p>
      </div>
    </div>
  );
} 