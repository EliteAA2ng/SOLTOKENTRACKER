import { useEffect, useState } from 'react';
import { useAppDispatch } from '../store/hooks';
import { setWalletAddress } from '../store/formSlice';

export function AutoWalletConnect() {
  const dispatch = useAppDispatch();
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    // Only attempt once per page load
    if (hasAttempted) return;
    
    const attemptAutoConnect = async () => {
      setIsConnecting(true);
      setHasAttempted(true);
      
      try {
        // Check for Phantom wallet first (most common)
        if (typeof window !== 'undefined' && (window as any).phantom?.solana?.isPhantom) {
          const phantom = (window as any).phantom.solana;
          
          // Check if wallet was previously connected (has trust)
          if (phantom.isConnected || phantom._connected) {
            console.log('Phantom wallet previously connected, attempting auto-connect...');
            
            try {
              // Try silent connect first (won't show popup if previously authorized)
              const response = await phantom.connect({ onlyIfTrusted: true });
              const publicKey = response.publicKey;
              
              if (publicKey) {
                const address = publicKey.toString();
                dispatch(setWalletAddress(address));
                console.log('Auto-connected to Phantom wallet:', address);
                return;
              }
            } catch (error) {
              console.log('Silent connect failed, wallet not previously authorized');
            }
          }
        }
        
        // Check for Solflare wallet
        if (typeof window !== 'undefined' && (window as any).solflare?.isSolflare) {
          const solflare = (window as any).solflare;
          
          // Check if wallet was previously connected
          if (solflare.isConnected) {
            console.log('Solflare wallet previously connected, attempting auto-connect...');
            
            try {
              const response = await solflare.connect();
              const publicKey = response.publicKey || solflare.publicKey;
              
              if (publicKey) {
                const address = publicKey.toString();
                dispatch(setWalletAddress(address));
                console.log('Auto-connected to Solflare wallet:', address);
                return;
              }
            } catch (error) {
              console.log('Solflare auto-connect failed');
            }
          }
        }
        
        // Check for Backpack wallet
        if (typeof window !== 'undefined' && (window as any).backpack?.isBackpack) {
          const backpack = (window as any).backpack;
          
          if (backpack.isConnected) {
            console.log('Backpack wallet previously connected, attempting auto-connect...');
            
            try {
              const response = await backpack.connect();
              const publicKey = response.publicKey || backpack.publicKey;
              
              if (publicKey) {
                const address = publicKey.toString();
                dispatch(setWalletAddress(address));
                console.log('Auto-connected to Backpack wallet:', address);
                return;
              }
            } catch (error) {
              console.log('Backpack auto-connect failed');
            }
          }
        }
        
        // Check for other wallets with standard interface
        const walletProviders = [
          { name: 'Glow', provider: (window as any).glow },
          { name: 'Coinbase', provider: (window as any).coinbaseSolana },
          { name: 'Trust', provider: (window as any).trustwallet?.solana },
          { name: 'Slope', provider: (window as any).Slope },
          { name: 'Torus', provider: (window as any).torus?.solana },
          { name: 'Clover', provider: (window as any).clover_solana },
          { name: 'Exodus', provider: (window as any).exodus?.solana },
        ];
        
        for (const { name, provider } of walletProviders) {
          if (provider && (provider.isConnected || provider._connected)) {
            console.log(`${name} wallet previously connected, attempting auto-connect...`);
            
            try {
              const response = await provider.connect();
              const publicKey = response.publicKey || provider.publicKey;
              
              if (publicKey) {
                const address = publicKey.toString();
                dispatch(setWalletAddress(address));
                console.log(`Auto-connected to ${name} wallet:`, address);
                return;
              }
            } catch (error) {
              console.log(`${name} auto-connect failed`);
            }
          }
        }
        
        console.log('No wallets available for auto-connect or user has not previously authorized');
      } catch (error) {
        console.error('Error during auto-connect attempt:', error);
      } finally {
        setIsConnecting(false);
      }
    };
    
    // Delay auto-connect attempt to ensure wallets are fully loaded
    const timeoutId = setTimeout(() => {
      attemptAutoConnect();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [dispatch, hasAttempted]);
  
  // Show a subtle indicator while attempting to connect
  if (isConnecting) {
    return (
      <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-3 flex items-center gap-2 z-50 animate-fade-in-out">
        <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"></div>
        <span className="text-sm text-slate-600">Checking for wallet...</span>
      </div>
    );
  }
  
  return null;
} 