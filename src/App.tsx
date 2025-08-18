import { useState, useMemo } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { Header } from './components/Header';
import WalletInput from './components/WalletInput';
import TransferList from './components/TransferList';
import { TokenInfoCard } from './components/TokenInfoCard';
import { ApiStatusModal } from './components/ApiStatusModal';
import { AutoWalletConnect } from './components/AutoWalletConnect';
import { SolanaService } from './services/solanaService';
import { getHeliusRpcUrl, PUBLIC_RPC_URL } from './config';
import { TokenTransfer, TokenMetadata } from './types';
import { ArrowLeft, Activity, Search } from 'lucide-react';
import { store } from './store/store';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60000, // 1 minute
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
  const [showApiStatus, setShowApiStatus] = useState(false);
  const [transfers, setTransfers] = useState<TokenTransfer[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState<string>('');

  const { data: tokenMetadata, isLoading: isLoadingMetadata } = useQuery({
    queryKey: ['tokenMetadata', appState?.tokenMint],
    queryFn: async (): Promise<TokenMetadata> => {
      if (!appState) throw new Error('No app state');
      const rpcUrl = appState.heliusKey ? getHeliusRpcUrl(appState.heliusKey) : PUBLIC_RPC_URL;
      const service = new SolanaService(rpcUrl);
      return await service.getTokenMetadata(appState.tokenMint);
    },
    enabled: !!appState?.tokenMint,
  });

  const isLoading = isLoadingMetadata || isStreaming;

  const handleAnalyze = async (data: {
    tokenMint: string;
    walletAddress?: string;
    heliusKey: string;
    seconds: number;
  }) => {
    setAppState({ 
      tokenMint: data.tokenMint, 
      walletAddress: data.walletAddress || undefined, 
      heliusKey: data.heliusKey, 
      seconds: data.seconds 
    });

    // Start streaming transfers immediately (don't wait for metadata)
    setTransfers([]); // Clear previous results
    setIsStreaming(true);
    setStreamingProgress('Starting search...');

    try {
      const rpcUrl = data.heliusKey ? getHeliusRpcUrl(data.heliusKey) : PUBLIC_RPC_URL;
      const service = new SolanaService(rpcUrl);

      await service.getTokenTransfersStream(
        data.tokenMint,
        data.walletAddress || undefined,
        data.seconds,
        (cumulativeTransfers: TokenTransfer[]) => {
          // Service sends cumulative transfers already deduplicated
          console.log(`📊 App: Received ${cumulativeTransfers.length} cumulative transfers`);
          setTransfers(cumulativeTransfers);
        },
        (progress: string) => {
          setStreamingProgress(progress);
        }
      );

      setStreamingProgress('Search completed!');
    } catch (error) {
      console.error('Streaming error:', error);
      setStreamingProgress('Search failed. Please try again.');
    } finally {
      setIsStreaming(false);
      // Clear progress after a delay
      setTimeout(() => setStreamingProgress(''), 3000);
    }
  };

  const handleReset = () => {
    setAppState(null);
    setTransfers([]);
    setIsStreaming(false);
    setStreamingProgress('');
  };

  const combinedTransfers = transfers || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <AutoWalletConnect />
      <Header />
      
      {!appState ? (
        <WalletInput onSubmit={handleAnalyze} loading={isLoading} />
      ) : (
        <>
          {/* Secondary Header with Back Button */}
          <div className="bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-14">
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
                    <h2 className="text-sm font-semibold text-slate-900">
                      {tokenMetadata?.name || 'Token'} Transfer Analytics
                    </h2>
                    <p className="text-xs text-slate-600">
                      {appState?.walletAddress 
                        ? `${appState.walletAddress.slice(0, 8)}...${appState.walletAddress.slice(-8)}`
                        : `All ${tokenMetadata?.symbol || 'Token'} transfers`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <button
                    onClick={() => setShowApiStatus(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                    title="Check API Status"
                  >
                    <Activity className="w-3 h-3" />
                    API Status
                  </button>
                  <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                  <span className="text-xs">{tokenMetadata?.symbol || 'TOKEN'}</span>
                  <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                  <span className="text-xs">Lookback: {appState?.seconds || 0}s</span>
                  
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Loading skeleton for TokenInfoCard */}
            {isLoadingMetadata && (
              <div className="mb-8">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-pulse">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-slate-300 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-8 bg-slate-300 rounded w-48 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-32"></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-4">
                          <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
                          <div className="h-6 bg-slate-300 rounded w-24"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Token Information Card */}
            {tokenMetadata && (
              <div className="mb-8">
                <TokenInfoCard tokenMetadata={tokenMetadata} />
              </div>
            )}


            {/* Transfer List Section */}
            {(combinedTransfers.length > 0 && tokenMetadata) && (
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-900">Recent Transfers</h2>
                  <p className="text-sm text-slate-600">
                    {combinedTransfers.length} transfer{combinedTransfers.length !== 1 ? 's' : ''} found
                    {appState?.walletAddress ? ` for wallet ${appState.walletAddress.slice(0, 8)}...${appState.walletAddress.slice(-8)}` : ''}
                  </p>
                </div>
                <TransferList 
                  transfers={combinedTransfers} 
                  tokenMetadata={tokenMetadata} 
                  walletAddress={appState?.walletAddress}
                />
              </div>
            )}

            {/* Show transfers found but metadata loading */}
            {(combinedTransfers.length > 0 && !tokenMetadata) && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-slate-600">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                  <span>Loading token information for {combinedTransfers.length} transfers...</span>
                </div>
              </div>
            )}

            {isLoading && combinedTransfers.length === 0 && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-slate-600">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                  <span>{streamingProgress || 'Scanning blockchain for transfers...'}</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Transfers will appear in real-time as they are found
                </p>
              </div>
            )}

            {/* Show streaming progress even when transfers are found */}
            {isStreaming && combinedTransfers.length > 0 && (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 text-slate-600">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                  <span className="text-sm">{streamingProgress}</span>
                </div>
              </div>
            )}

            {!isLoading && combinedTransfers.length === 0 && appState && (
              <div className="text-center py-8">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No transfers found
                  </h3>
                  <p className="text-slate-600 text-sm">
                    No {tokenMetadata?.symbol || 'token'} transfers found in the last {appState?.seconds || 0} seconds.
                    {appState?.walletAddress && (
                      <span> for wallet {appState.walletAddress.slice(0, 8)}...{appState.walletAddress.slice(-8)}</span>
                    )}
                  </p>
                  <p className="text-slate-500 text-xs mt-2">
                    Try increasing the lookback period or check if the addresses are correct.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* API Status Modal */}
      <ApiStatusModal 
        isOpen={showApiStatus}
        onClose={() => setShowApiStatus(false)}
      />
    </div>
  );
}

function WalletApp() {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <TokenTracker />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <WalletApp />
      </QueryClientProvider>
    </Provider>
  );
}
