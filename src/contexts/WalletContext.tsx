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
        walletsLength: wallets.length,
        phantomAvailable: !!(window as any).phantom?.solana?.isPhantom,
        solflareAvailable: !!(window as any).solflare?.isSolflare
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

      // Skip if no wallets available
      if (wallets.length === 0) {
        console.log('🔍 WalletContext: No wallets available yet, will retry');
        return;
      }

      // Check if this is first visit (but don't mark as attempted yet)
      const sessionAttempted = sessionStorage.getItem('walletAutoConnectAttempted');
      if (sessionAttempted) {
        console.log('🔍 WalletContext: Session already attempted, skipping');
        setHasAttemptedAutoConnect(true);
        return;
      }

      console.log('🚀 WalletContext: Starting auto-connect...');
      setIsAutoConnecting(true);
      setHasAttemptedAutoConnect(true);

      let connectionSuccessful = false;

      try {
        // Try to connect to previously connected wallet
        const previousWalletName = localStorage.getItem('connectedWalletName');
        if (previousWalletName) {
          const previousWallet = wallets.find(w => w.adapter.name === previousWalletName);
          if (previousWallet) {
            console.log('🔄 WalletContext: Attempting to reconnect to', previousWalletName);
            select(previousWallet.adapter.name);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Increased wait time
            await connect();
            console.log('✅ WalletContext: Successfully reconnected to', previousWalletName);
            connectionSuccessful = true;
            return;
          } else {
            console.log('⚠️ WalletContext: Previous wallet adapter not found:', previousWalletName);
          }
        }

        // Wait a bit more for wallet extensions to fully load
        await new Promise(resolve => setTimeout(resolve, 500));

        // Try Phantom if available
        if ((window as any).phantom?.solana?.isPhantom) {
          const phantomWallet = wallets.find(w => 
            w.adapter.name.toLowerCase().includes('phantom')
          );
          if (phantomWallet) {
            console.log('👻 WalletContext: Auto-connecting to Phantom...');
            select(phantomWallet.adapter.name);
            await new Promise(resolve => setTimeout(resolve, 1500));
            await connect();
            console.log('✅ WalletContext: Successfully connected to Phantom');
            connectionSuccessful = true;
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
            await new Promise(resolve => setTimeout(resolve, 1500));
            await connect();
            console.log('✅ WalletContext: Successfully connected to Solflare');
            connectionSuccessful = true;
            return;
          } else {
            console.log('⚠️ WalletContext: Solflare detected but adapter not found');
          }
        }

        console.log('ℹ️ WalletContext: No compatible wallets found for auto-connect');

      } catch (error) {
        console.log('⚠️ WalletContext: Auto-connect failed:', error);
        setConnectionError(`Auto-connect failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsAutoConnecting(false);
        
        // Only mark session as attempted if we actually tried to connect
        // This allows retry on page refresh if auto-connect failed due to timing
        if (connectionSuccessful) {
          console.log('✅ WalletContext: Marking session as attempted after successful connection');
          sessionStorage.setItem('walletAutoConnectAttempted', 'true');
        } else {
          console.log('⚠️ WalletContext: Auto-connect unsuccessful, not marking session (will retry on refresh)');
        }
      }
    };

    // Multiple retry attempts with increasing delays
    const timer1 = setTimeout(attemptAutoConnect, 1000); // First attempt after 1s
    const timer2 = setTimeout(() => {
      if (!connected && !hasAttemptedAutoConnect) {
        console.log('🔄 WalletContext: First retry attempt...');
        attemptAutoConnect();
      }
    }, 3000); // Second attempt after 3s
    
    const timer3 = setTimeout(() => {
      if (!connected && !hasAttemptedAutoConnect) {
        console.log('🔄 WalletContext: Final retry attempt...');
        attemptAutoConnect();
      }
    }, 6000); // Final attempt after 6s
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
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