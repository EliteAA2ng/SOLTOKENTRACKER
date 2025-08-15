import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export function AutoWalletConnect() {
  const { wallet, connect, connected, connecting } = useWallet();

  useEffect(() => {
    // Auto-connect if wallet is available and not already connected
    if (wallet && !connected && !connecting) {
      try {
        connect();
      } catch (error) {
        console.log('Auto-connect failed:', error);
      }
    }
  }, [wallet, connected, connecting, connect]);

  if (connecting) {
    return (
      <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-3 flex items-center gap-2 z-50 animate-fade-in-out">
        <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"></div>
        <span className="text-sm text-slate-600">Connecting wallet...</span>
      </div>
    );
  }

  return null;
} 