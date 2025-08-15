import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface AutoConnectWalletProps {
  onConnectingChange?: (isConnecting: boolean) => void;
}

export function AutoConnectWallet({ onConnectingChange }: AutoConnectWalletProps) {
  const { wallet, wallets, select, connect, connected, connecting } = useWallet();
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false);

  // Check if this is the first visit in this session
  const isFirstVisit = !sessionStorage.getItem('walletAutoConnectAttempted');

  // Extract auto-connect logic into a separate function
  const triggerAutoConnect = async () => {
    console.log('🔍 Auto-connect check:', {
      isFirstVisit,
      hasAttemptedAutoConnect,
      connected,
      connecting,
      walletsAvailable: wallets.length,
      sessionStorageValue: sessionStorage.getItem('walletAutoConnectAttempted')
    });

    // For manual trigger, skip the first visit check
    const isManualTrigger = !sessionStorage.getItem('walletAutoConnectAttempted') && hasAttemptedAutoConnect === false;
    
    // Only auto-connect on first visit and if not already attempted (or manual trigger)
    if (!isManualTrigger && (!isFirstVisit || hasAttemptedAutoConnect || connected || connecting)) {
      console.log('⏭️ Skipping auto-connect:', {
        reason: !isFirstVisit ? 'not first visit' : 
                hasAttemptedAutoConnect ? 'already attempted' :
                connected ? 'already connected' : 'currently connecting'
      });
      return;
    }

    // Check if we have any wallets available
    if (wallets.length === 0) {
      console.log('⚠️ No wallet adapters available yet, will retry...');
      return;
    }

    // Mark that we've attempted auto-connect for this session
    sessionStorage.setItem('walletAutoConnectAttempted', 'true');
    setHasAttemptedAutoConnect(true);
    
    // Notify parent component that we're connecting
    onConnectingChange?.(true);

    console.log('🔄 First visit detected - attempting automatic wallet connection...');

    // Check for available wallet extensions in browser
    const availableWallets = {
      phantom: typeof window !== 'undefined' && (window as any).phantom?.solana?.isPhantom,
      solflare: typeof window !== 'undefined' && (window as any).solflare?.isSolflare,
      backpack: typeof window !== 'undefined' && (window as any).backpack?.isBackpack,
    };
    
    console.log('🌐 Browser wallet extensions detected:', availableWallets);

    try {
      // Strategy 1: Try to connect to a previously connected wallet
      const previousWallet = localStorage.getItem('walletName');
      
      if (previousWallet) {
        console.log(`📱 Found previous wallet: ${previousWallet}`);
        const previousWalletAdapter = wallets.find(w => w.adapter.name === previousWallet);
        
        if (previousWalletAdapter) {
          console.log(`🔗 Selecting and connecting to ${previousWallet}...`);
          select(previousWalletAdapter.adapter.name);
          
          // Wait a bit for selection to take effect
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (wallet && wallet.adapter.name === previousWallet) {
            await connect();
            console.log(`✅ Successfully auto-connected to ${previousWallet}`);
            return;
          }
        }
      }

      // Strategy 2: Try to connect to Phantom if it's installed and ready
      if (typeof window !== 'undefined' && (window as any).phantom?.solana?.isPhantom) {
        console.log('👻 Phantom detected, checking connection status...');
        
        // Try to get Phantom adapter
        const phantomAdapter = wallets.find(w => w.adapter.name.toLowerCase().includes('phantom'));
        
        if (phantomAdapter) {
          console.log('🔗 Selecting Phantom wallet...');
          select(phantomAdapter.adapter.name);
          
          // Wait for selection
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            await connect();
            console.log('✅ Successfully auto-connected to Phantom');
            return;
          } catch (error) {
            console.log('⚠️ Phantom connection failed:', error);
          }
        }
      }

      // Strategy 3: Try Solflare if available
      if (typeof window !== 'undefined' && (window as any).solflare?.isSolflare) {
        console.log('🔥 Solflare detected, attempting connection...');
        
        const solflareAdapter = wallets.find(w => w.adapter.name.toLowerCase().includes('solflare'));
        
        if (solflareAdapter) {
          console.log('🔗 Selecting Solflare wallet...');
          select(solflareAdapter.adapter.name);
          
          // Wait for selection
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            await connect();
            console.log('✅ Successfully auto-connected to Solflare');
            return;
          } catch (error) {
            console.log('⚠️ Solflare connection failed:', error);
          }
        }
      }

      console.log('❌ Auto-connect failed - user will need to connect manually');

    } catch (error) {
      console.log('❌ Auto-connect error:', error);
    } finally {
      // Always reset connecting state
      onConnectingChange?.(false);
    }
  };

  // Add debugging for component mount
  useEffect(() => {
    console.log('🚀 AutoConnectWallet component mounted');
    console.log('📊 Initial state:', {
      isFirstVisit,
      hasAttemptedAutoConnect,
      connected,
      connecting,
      walletsAvailable: wallets.length,
      sessionStorageValue: sessionStorage.getItem('walletAutoConnectAttempted')
    });

    // Force auto-connect for testing (remove this after debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 Development mode - forcing auto-connect test in 5 seconds...');
      setTimeout(() => {
        console.log('🧪 Forced auto-connect test triggered');
        sessionStorage.removeItem('walletAutoConnectAttempted');
        setHasAttemptedAutoConnect(false);
      }, 5000);
    }

    // Listen for manual auto-connect trigger
    const handleForceAutoConnect = () => {
      console.log('🚀 Manual auto-connect event received');
      sessionStorage.removeItem('walletAutoConnectAttempted');
      setHasAttemptedAutoConnect(false);
      // Trigger auto-connect immediately
      setTimeout(() => {
        console.log('🚀 Triggering manual auto-connect...');
        triggerAutoConnect();
      }, 100);
    };

    window.addEventListener('forceAutoConnect', handleForceAutoConnect);
    
    return () => {
      window.removeEventListener('forceAutoConnect', handleForceAutoConnect);
    };
  }, []);

  useEffect(() => {
    // Add a longer delay to ensure wallet adapters and DOM are ready
    const timer = setTimeout(triggerAutoConnect, 3000); // Increased from 1500ms to 3000ms
    
    return () => clearTimeout(timer);
  }, [wallet, wallets, select, connect, connected, connecting, hasAttemptedAutoConnect, isFirstVisit, onConnectingChange]);

  // Store wallet name when successfully connected for future auto-connect
  useEffect(() => {
    if (connected && wallet) {
      console.log(`💾 Storing wallet name: ${wallet.adapter.name}`);
      localStorage.setItem('walletName', wallet.adapter.name);
    }
  }, [connected, wallet]);

  // Return connecting state for parent components to use
  return null;
}

// Export the connecting state for other components to use
export function useAutoConnectState() {
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  return { isAutoConnecting, setIsAutoConnecting };
} 