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

  useEffect(() => {
    const autoConnect = async () => {
      console.log('🔍 Auto-connect check:', {
        isFirstVisit,
        hasAttemptedAutoConnect,
        connected,
        connecting,
        walletsAvailable: wallets.length
      });

      // Only auto-connect on first visit and if not already attempted
      if (!isFirstVisit || hasAttemptedAutoConnect || connected || connecting) {
        console.log('⏭️ Skipping auto-connect:', {
          reason: !isFirstVisit ? 'not first visit' : 
                  hasAttemptedAutoConnect ? 'already attempted' :
                  connected ? 'already connected' : 'currently connecting'
        });
        return;
      }

      // Mark that we've attempted auto-connect for this session
      sessionStorage.setItem('walletAutoConnectAttempted', 'true');
      setHasAttemptedAutoConnect(true);
      
      // Notify parent component that we're connecting
      onConnectingChange?.(true);

      console.log('🔄 First visit detected - attempting automatic wallet connection...');

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

    // Add a delay to ensure wallet adapters and DOM are ready
    const timer = setTimeout(autoConnect, 1500);
    
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