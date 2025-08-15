import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export function AutoConnectWallet() {
  const { wallet, wallets, select, connect, connected, connecting } = useWallet();
  const [hasTriedAutoConnect, setHasTriedAutoConnect] = useState(false);

  useEffect(() => {
    const autoConnect = async () => {
      // Skip if already tried, connected, or connecting
      if (hasTriedAutoConnect || connected || connecting) return;

      console.log('🔄 Attempting automatic wallet connection...');
      setHasTriedAutoConnect(true);

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

        // Strategy 4: Try the first available wallet adapter
        if (wallets.length > 0) {
          console.log('🎯 Trying first available wallet adapter...');
          const firstWallet = wallets[0];
          select(firstWallet.adapter.name);
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            await connect();
            console.log(`✅ Successfully auto-connected to ${firstWallet.adapter.name}`);
            return;
          } catch (error) {
            console.log(`⚠️ ${firstWallet.adapter.name} connection failed:`, error);
          }
        }

        console.log('❌ All auto-connect strategies failed - user will need to connect manually');

      } catch (error) {
        console.log('❌ Auto-connect error:', error);
      }
    };

    // Add a delay to ensure wallet adapters and DOM are ready
    const timer = setTimeout(autoConnect, 1500);
    
    return () => clearTimeout(timer);
  }, [wallet, wallets, select, connect, connected, connecting, hasTriedAutoConnect]);

  // Store wallet name when successfully connected for future auto-connect
  useEffect(() => {
    if (connected && wallet) {
      console.log(`💾 Storing wallet name: ${wallet.adapter.name}`);
      localStorage.setItem('walletName', wallet.adapter.name);
    }
  }, [connected, wallet]);

  // Reset auto-connect attempt when wallet changes
  useEffect(() => {
    if (wallet) {
      setHasTriedAutoConnect(false);
    }
  }, [wallet]);

  return null; // This component doesn't render anything
} 