import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export function AutoConnectWallet() {
  const { wallets, select, connect, connected, connecting, wallet } = useWallet();
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    const attemptAutoConnect = async () => {
      console.log('🔍 AutoConnect: Starting check...', {
        connected,
        connecting,
        walletsCount: wallets.length,
        hasAttempted
      });

      // Skip if already connected, connecting, or already attempted
      if (connected || connecting || hasAttempted) {
        console.log('🔍 AutoConnect: Skipping -', { connected, connecting, hasAttempted });
        return;
      }

      // Skip if no wallets available yet
      if (wallets.length === 0) {
        console.log('🔍 AutoConnect: No wallets available yet, retrying...');
        return;
      }

      // Check session storage to prevent multiple attempts per session
      const sessionAttempted = sessionStorage.getItem('autoConnectAttempted');
      if (sessionAttempted) {
        console.log('🔍 AutoConnect: Already attempted this session');
        setHasAttempted(true);
        return;
      }

      // Mark as attempted
      setHasAttempted(true);
      sessionStorage.setItem('autoConnectAttempted', 'true');

      console.log('🚀 AutoConnect: Starting automatic wallet connection...');

      try {
        // Check for Phantom wallet
        if ((window as any).phantom?.solana?.isPhantom) {
          console.log('👻 AutoConnect: Phantom detected in browser');
          
          const phantomAdapter = wallets.find(w => 
            w.adapter.name.toLowerCase().includes('phantom')
          );

          if (phantomAdapter) {
            console.log('👻 AutoConnect: Found Phantom adapter, attempting connection...');
            
            try {
              select(phantomAdapter.adapter.name);
              
              // Wait for adapter selection
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Attempt connection
              await connect();
              
              console.log('✅ AutoConnect: Successfully connected to Phantom!');
              return;
            } catch (phantomError) {
              console.log('⚠️ AutoConnect: Phantom connection failed:', phantomError);
            }
          } else {
            console.log('⚠️ AutoConnect: Phantom detected but no adapter found');
          }
        }

        // Check for Solflare wallet
        if ((window as any).solflare?.isSolflare) {
          console.log('🔥 AutoConnect: Solflare detected in browser');
          
          const solflareAdapter = wallets.find(w => 
            w.adapter.name.toLowerCase().includes('solflare')
          );

          if (solflareAdapter) {
            console.log('🔥 AutoConnect: Found Solflare adapter, attempting connection...');
            
            try {
              select(solflareAdapter.adapter.name);
              
              // Wait for adapter selection
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Attempt connection
              await connect();
              
              console.log('✅ AutoConnect: Successfully connected to Solflare!');
              return;
            } catch (solflareError) {
              console.log('⚠️ AutoConnect: Solflare connection failed:', solflareError);
            }
          } else {
            console.log('⚠️ AutoConnect: Solflare detected but no adapter found');
          }
        }

        console.log('ℹ️ AutoConnect: No compatible wallets found or all connection attempts failed');

      } catch (error) {
        console.log('❌ AutoConnect: Unexpected error during auto-connect:', error);
      }
    };

    // Initial attempt with delay to ensure wallet adapters are ready
    const initialTimer = setTimeout(attemptAutoConnect, 2000);
    
    // Retry mechanism in case wallets weren't ready on first attempt
    const retryTimer = setTimeout(() => {
      if (!connected && !hasAttempted && wallets.length > 0) {
        console.log('🔄 AutoConnect: Retrying auto-connect...');
        attemptAutoConnect();
      }
    }, 4000);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(retryTimer);
    };
  }, [wallets, select, connect, connected, connecting, hasAttempted]);

  // Log connection state changes
  useEffect(() => {
    if (connected && wallet) {
      console.log('✅ AutoConnect: Wallet connected successfully:', wallet.adapter.name);
    }
  }, [connected, wallet]);

  return null;
} 