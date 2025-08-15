import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export function AutoConnectWallet() {
  const { wallets, select, connect, connected, connecting } = useWallet();

  useEffect(() => {
    const attemptAutoConnect = async () => {
      // Skip if already connected or connecting
      if (connected || connecting) return;
      
      // Skip if no wallets available
      if (wallets.length === 0) return;
      
      // Check if this is first visit (no previous auto-connect attempt)
      const hasAttempted = sessionStorage.getItem('autoConnectAttempted');
      if (hasAttempted) return;
      
      // Mark that we've attempted auto-connect
      sessionStorage.setItem('autoConnectAttempted', 'true');
      
      console.log('🔄 Attempting auto-connect...');
      
      try {
        // Try to connect to Phantom first (most popular)
        const phantomWallet = wallets.find(w => 
          w.adapter.name.toLowerCase().includes('phantom')
        );
        
        if (phantomWallet && (window as any).phantom?.solana?.isPhantom) {
          console.log('👻 Auto-connecting to Phantom...');
          select(phantomWallet.adapter.name);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for selection
          await connect();
          console.log('✅ Auto-connected to Phantom');
          return;
        }
        
        // Try Solflare as backup
        const solflareWallet = wallets.find(w => 
          w.adapter.name.toLowerCase().includes('solflare')
        );
        
        if (solflareWallet && (window as any).solflare?.isSolflare) {
          console.log('🔥 Auto-connecting to Solflare...');
          select(solflareWallet.adapter.name);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for selection
          await connect();
          console.log('✅ Auto-connected to Solflare');
          return;
        }
        
        console.log('ℹ️ No compatible wallets found for auto-connect');
        
      } catch (error) {
        console.log('⚠️ Auto-connect failed:', error);
      }
    };

    // Delay to ensure wallets are loaded
    const timer = setTimeout(attemptAutoConnect, 2000);
    
    return () => clearTimeout(timer);
  }, [wallets, select, connect, connected, connecting]);

  return null; // This component doesn't render anything
} 