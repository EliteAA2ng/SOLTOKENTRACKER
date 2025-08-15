import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface WalletContextType {
  // Wallet connection state
  isConnected: boolean;
  walletAddress: string | null;
  isConnecting: boolean;
  isAutoConnecting: boolean;
  
  // Manual input state
  manualAddress: string;
  setManualAddress: (address: string) => void;
  
  // Connection functions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  
  // State helpers
  getActiveAddress: () => string;
  isInputDisabled: () => boolean;
  
  // Error state
  connectionError: string | null;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { 
    connected, 
    publicKey, 
    connect, 
    disconnect, 
    connecting, 
    select,
    wallet,
    wallets 
  } = useWallet();

  // Local state
  const [manualAddress, setManualAddress] = useState('');
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false);

  // Derived state
  const isConnected = connected;
  const walletAddress = publicKey?.toString() || null;
  const isConnecting = connecting;

  // Auto-connect logic
  useEffect(() => {
    const attemptAutoConnect = async () => {
      console.log('🔍 WalletContext: Auto-connect check', {
        connected,
        connecting,
        hasAttemptedAutoConnect,
        walletsLength: wallets.length
      });

      // Skip if already connected, connecting, or already attempted
      if (connected || connecting || hasAttemptedAutoConnect) {
        console.log('🔍 WalletContext: Skipping auto-connect', {
          connected,
          connecting,
          hasAttemptedAutoConnect
        });
        return;
      }

      // Check if this is first visit
      const sessionAttempted = sessionStorage.getItem('walletAutoConnectAttempted');
      if (sessionAttempted) {
        console.log('🔍 WalletContext: Session already attempted, skipping');
        setHasAttemptedAutoConnect(true);
        return;
      }

      // Skip if no wallets available
      if (wallets.length === 0) {
        console.log('🔍 WalletContext: No wallets available yet, will retry');
        return;
      }

      console.log('🚀 WalletContext: Starting auto-connect...');
      setIsAutoConnecting(true);
      setHasAttemptedAutoConnect(true);
      sessionStorage.setItem('walletAutoConnectAttempted', 'true');

      try {
        // Try to connect to previously connected wallet
        const previousWalletName = localStorage.getItem('connectedWalletName');
        if (previousWalletName) {
          const previousWallet = wallets.find(w => w.adapter.name === previousWalletName);
          if (previousWallet) {
            console.log('🔄 WalletContext: Attempting to reconnect to', previousWalletName);
            select(previousWallet.adapter.name);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Increased wait time
            await connect();
            console.log('✅ WalletContext: Successfully reconnected to', previousWalletName);
            return;
          } else {
            console.log('⚠️ WalletContext: Previous wallet adapter not found:', previousWalletName);
          }
        }

        // Try Phantom if available
        if ((window as any).phantom?.solana?.isPhantom) {
          const phantomWallet = wallets.find(w => 
            w.adapter.name.toLowerCase().includes('phantom')
          );
          if (phantomWallet) {
            console.log('👻 WalletContext: Auto-connecting to Phantom...');
            select(phantomWallet.adapter.name);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await connect();
            console.log('✅ WalletContext: Successfully connected to Phantom');
            return;
          } else {
            console.log('⚠️ WalletContext: Phantom detected but adapter not found');
          }
        }

        // Try Solflare if available
        if ((window as any).solflare?.isSolflare) {
          const solflareWallet = wallets.find(w => 
            w.adapter.name.toLowerCase().includes('solflare')
          );
          if (solflareWallet) {
            console.log('🔥 WalletContext: Auto-connecting to Solflare...');
            select(solflareWallet.adapter.name);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await connect();
            console.log('✅ WalletContext: Successfully connected to Solflare');
            return;
          } else {
            console.log('⚠️ WalletContext: Solflare detected but adapter not found');
          }
        }

        console.log('ℹ️ WalletContext: No compatible wallets found for auto-connect');

      } catch (error) {
        console.log('⚠️ WalletContext: Auto-connect failed:', error);
        setConnectionError('Auto-connect failed. You can connect manually.');
      } finally {
        setIsAutoConnecting(false);
      }
    };

    // Delay to ensure wallet adapters are loaded, with retry mechanism
    const timer1 = setTimeout(attemptAutoConnect, 2000);
    
    // Retry if wallets weren't ready the first time
    const timer2 = setTimeout(() => {
      if (!connected && !hasAttemptedAutoConnect && wallets.length > 0) {
        console.log('🔄 WalletContext: Retrying auto-connect...');
        attemptAutoConnect();
      }
    }, 5000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [wallets, select, connect, connected, connecting, hasAttemptedAutoConnect]);

  // Store connected wallet name for future auto-connect
  useEffect(() => {
    if (connected && wallet) {
      console.log('💾 WalletContext: Storing connected wallet:', wallet.adapter.name);
      localStorage.setItem('connectedWalletName', wallet.adapter.name);
    } else {
      localStorage.removeItem('connectedWalletName');
    }
  }, [connected, wallet]);

  // Clear manual address when wallet connects
  useEffect(() => {
    if (connected && walletAddress) {
      setManualAddress('');
      setConnectionError(null);
    }
  }, [connected, walletAddress]);

  // Connection functions
  const connectWallet = async () => {
    try {
      setConnectionError(null);
      await connect();
    } catch (error) {
      console.error('Connect error:', error);
      setConnectionError('Failed to connect wallet. Please try again.');
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      setConnectionError(null);
      await disconnect();
      console.log('🔌 WalletContext: Wallet disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      setConnectionError('Failed to disconnect wallet.');
      throw error;
    }
  };

  // Helper functions
  const getActiveAddress = (): string => {
    return walletAddress || manualAddress;
  };

  const isInputDisabled = (): boolean => {
    return connected;
  };

  const clearError = () => {
    setConnectionError(null);
  };

  const contextValue: WalletContextType = {
    // State
    isConnected,
    walletAddress,
    isConnecting,
    isAutoConnecting,
    manualAddress,
    setManualAddress,
    
    // Functions
    connectWallet,
    disconnectWallet,
    getActiveAddress,
    isInputDisabled,
    
    // Error handling
    connectionError,
    clearError,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
} 