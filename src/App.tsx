import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CloverWalletAdapter,
  Coin98WalletAdapter,
  LedgerWalletAdapter,
  MathWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import WalletInput from './components/WalletInput';
import TransferList from './components/TransferList';
import { TokenInfoCard } from './components/TokenInfoCard';
import { ApiStatusModal } from './components/ApiStatusModal';
import { AutoConnectWallet } from './components/AutoConnectWallet';
import { SolanaService } from './services/solanaService';
import { getHeliusRpcUrl, PUBLIC_RPC_URL } from './config';
import { TokenTransfer, TokenMetadata } from './types';
import { ArrowLeft, AlertCircle, Activity } from 'lucide-react';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

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
  walletAddressSource?: 'manual' | 'connected' | null;
}

function TokenTracker() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [streamTransfers, setStreamTransfers] = useState<TokenTransfer[]>([]);
  const [streamStart, setStreamStart] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [showApiStatus, setShowApiStatus] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const isStreaming = useRef(false);

  // Auto-connect wallet component with state management
  const autoConnectComponent = (
    <AutoConnectWallet 
      onConnectingChange={setIsAutoConnecting}
    />
  );

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

  const { data: transfers, isLoading: isLoadingTransfers, error } = useQuery({
    queryKey: ['tokenTransfers', appState?.tokenMint, appState?.walletAddress, appState?.heliusKey, appState?.seconds],
    queryFn: async (): Promise<TokenTransfer[]> => {
      if (!appState) return [];
      const rpcUrl = appState.heliusKey ? getHeliusRpcUrl(appState.heliusKey) : PUBLIC_RPC_URL;
      const service = new SolanaService(rpcUrl);
      // Non-stream final snapshot (still returned)
      return await service.getTokenTransfers(appState.tokenMint, appState.walletAddress, appState.seconds);
    },
    enabled: !!appState && !!tokenMetadata,
  });

  useEffect(() => {
    // Start streaming when appState becomes available
    const run = async () => {
      if (!appState) return;
      if (isStreaming.current) return;
      isStreaming.current = true;
      setIsTracking(true);
      setStreamTransfers([]);
      setStreamStart(Date.now());

      const rpcUrl = appState.heliusKey ? getHeliusRpcUrl(appState.heliusKey) : PUBLIC_RPC_URL;
      const service = new SolanaService(rpcUrl);
      try {
        await service.getTokenTransfersStream(
          appState.tokenMint,
          appState.walletAddress,
          appState.seconds,
          (batch) => setStreamTransfers((prev) => [...batch, ...prev])
        );
      } finally {
        isStreaming.current = false;
        setIsTracking(false);
      }
    };
    if (appState && tokenMetadata) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState?.tokenMint, appState?.walletAddress, appState?.heliusKey, appState?.seconds, !!tokenMetadata]);

  const isLoading = isLoadingMetadata || isLoadingTransfers;

  const handleAnalyze = (data: {
    tokenMint: string;
    walletAddress?: string;
    heliusKey: string;
    seconds: number;
    walletAddressSource?: 'manual' | 'connected' | null;
  }) => {
    setAppState({ 
      tokenMint: data.tokenMint, 
      walletAddress: data.walletAddress || undefined, 
      heliusKey: data.heliusKey, 
      seconds: data.seconds,
      walletAddressSource: data.walletAddressSource
    });
  };

  const handleReset = () => {
    // Save current appState to sessionStorage before resetting (session-only persistence)
    if (appState) {
      const formData = {
        tokenMint: appState.tokenMint,
        walletAddress: appState.walletAddress || '',
        heliusKey: appState.heliusKey,
        seconds: appState.seconds,
        walletAddressSource: appState.walletAddressSource // Save source
      };
      try {
        sessionStorage.setItem('solana-tracker-form', JSON.stringify(formData));
      } catch (error) {
        console.warn('Failed to save form data to sessionStorage before reset:', error);
      }
    }
    setAppState(null);
    setStreamTransfers([]);
    setStreamStart(null);
    setIsTracking(false);
    isStreaming.current = false;
  };

  if (!appState) {
    return (
      <>
        {autoConnectComponent}
        <WalletInput 
          onSubmit={handleAnalyze} 
          loading={isLoading}
          isAutoConnecting={isAutoConnecting}
        />
      </>
    );
  }

  const combinedTransfers = (streamTransfers.length ? streamTransfers : []).concat(transfers || []);

  return (
    <>
      {autoConnectComponent}
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
              <button
                onClick={() => setShowApiStatus(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                title="Check API Status"
              >
                <Activity className="w-3 h-3" />
                API Status
              </button>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <span>{tokenMetadata?.symbol || 'TOKEN'}</span>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              <span>Lookback: {appState.seconds}s</span>
              <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
              {streamStart && <span>Started: {new Date(streamStart).toLocaleTimeString()}</span>}
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

        {isTracking && (
          <div className="flex items-center justify-center mb-4">
            <div className="inline-flex items-center gap-2 text-slate-600 text-sm">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
              <span>Tracking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-white border border-red-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Analysis Warning</h3>
                  <p className="text-slate-700 mb-2">
                    {error instanceof Error ? error.message : 'An issue occurred while fetching transfer data.'}
                  </p>
                  {streamTransfers.length > 0 && (
                    <p className="text-slate-600 text-sm">Streaming results are still coming in below.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transfer List Section */}
        {(combinedTransfers.length > 0) && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-900">Recent Transfers</h2>
              <p className="text-sm text-slate-600">
                {combinedTransfers.length} transfer{combinedTransfers.length !== 1 ? 's' : ''} found
                {appState.walletAddress 
                  ? ` for wallet ${appState.walletAddress.slice(0, 8)}...${appState.walletAddress.slice(-8)}` 
                  : ''
                }
              </p>
            </div>
            <TransferList 
              transfers={combinedTransfers} 
              tokenMetadata={tokenMetadata!} 
              walletAddress={appState.walletAddress} 
            />
          </div>
        )}

        {isLoading && combinedTransfers.length === 0 && (
          <div className="text-center text-slate-600">Scanning blockchain for transfers...</div>
        )}
      </div>

      {/* API Status Modal */}
      <ApiStatusModal isOpen={showApiStatus} onClose={() => setShowApiStatus(false)} />
    </div>
    </>
  );
}

export default function App() {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Mainnet;
  
  // You can also provide a custom RPC endpoint
  const endpoint = PUBLIC_RPC_URL;

  // Initialize all the wallets you want to support
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network }),
    new CloverWalletAdapter(),
    new Coin98WalletAdapter(),
    new LedgerWalletAdapter(),
    new MathWalletAdapter(),
    new TorusWalletAdapter(),
  ];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={(error) => {
          // Log wallet errors but don't show them to users unless critical
          console.log('Wallet error:', error);
        }}
      >
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>
            <TokenTracker />
          </QueryClientProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
