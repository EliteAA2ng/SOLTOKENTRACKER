import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import WalletInput from './components/WalletInput';
import TransferList from './components/TransferList';
import { SolanaService } from './services/solanaService';
import { getHeliusRpcUrl, PUBLIC_RPC_URL } from './config';
import { TokenTransfer, TokenMetadata } from './types';
import { ArrowLeft, AlertCircle } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
    },
  },
});

interface AppState {
  tokenMint: string;
  walletAddress?: string;
  heliusKey: string;
  seconds: number;
}

function TokenTracker() {
  const [appState, setAppState] = useState<AppState | null>(null);

  const { data: tokenMetadata, isLoading: isLoadingMetadata } = useQuery({
    queryKey: ['tokenMetadata', appState?.tokenMint],
    queryFn: async (): Promise<TokenMetadata> => {
      if (!appState) throw new Error('No app state');
      
      const rpcUrl = appState.heliusKey 
        ? getHeliusRpcUrl(appState.heliusKey)
        : PUBLIC_RPC_URL;
      
      const service = new SolanaService(rpcUrl);
      return await service.getTokenMetadata(appState.tokenMint);
    },
    enabled: !!appState?.tokenMint,
  });

  const { data: transfers, isLoading: isLoadingTransfers, error } = useQuery({
    queryKey: ['tokenTransfers', appState?.tokenMint, appState?.walletAddress, appState?.heliusKey, appState?.seconds],
    queryFn: async (): Promise<TokenTransfer[]> => {
      if (!appState) return [];
      
      const rpcUrl = appState.heliusKey 
        ? getHeliusRpcUrl(appState.heliusKey)
        : PUBLIC_RPC_URL;
      
      const service = new SolanaService(rpcUrl);
      // Convert seconds to minutes for any fallback logic if needed inside service
      return await service.getTokenTransfers(appState.tokenMint, appState.walletAddress, appState.seconds);
    },
    enabled: !!appState && !!tokenMetadata,
  });

  const isLoading = isLoadingMetadata || isLoadingTransfers;

  const handleAnalyze = (tokenMint: string, walletAddress: string, heliusKey: string, seconds: number) => {
    setAppState({ 
      tokenMint, 
      walletAddress: walletAddress || undefined, 
      heliusKey, 
      seconds 
    });
  };

  const handleReset = () => {
    setAppState(null);
  };

  if (!appState) {
    return <WalletInput onSubmit={handleAnalyze} loading={isLoading} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div className="h-4 w-px bg-slate-300"></div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {tokenMetadata?.name || 'Token'} Transfer Analytics
                </h1>
                <p className="text-sm text-slate-600">
                  {appState.walletAddress 
                    ? `${appState.walletAddress.slice(0, 8)}...${appState.walletAddress.slice(-8)}`
                    : `All ${tokenMetadata?.symbol || 'Token'} transfers`
                  }
                </p>
              </div>
              </div>

            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>{tokenMetadata?.symbol || 'TOKEN'}</span>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <span>Lookback: {appState.seconds}s</span>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <span>Helius RPC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-xl border border-slate-200 mb-4">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Analyzing transfers
              </h3>
              <p className="text-slate-600 text-sm max-w-sm">
                {isLoadingMetadata 
                  ? 'Fetching token information...'
                  : `Scanning blockchain for ${tokenMetadata?.symbol || 'token'} transactions. This may take a few moments.`
                }
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-red-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Analysis Failed
                  </h3>
                  <p className="text-slate-700 mb-4">
                    {error instanceof Error ? error.message : 'An unexpected error occurred while fetching transfer data.'}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
                    >
                      Try Different Token
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors"
                    >
                      Retry Analysis
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {transfers && tokenMetadata && !isLoading && (
          <TransferList 
            transfers={transfers} 
            tokenMetadata={tokenMetadata}
            walletAddress={appState.walletAddress}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TokenTracker />
    </QueryClientProvider>
  );
}
