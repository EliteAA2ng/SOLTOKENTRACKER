import { useState, useEffect } from 'react';
import { Wallet, X, Copy, ExternalLink, CheckCircle } from 'lucide-react';

interface WalletConnectionProps {
  onWalletSelect: (address: string) => void;
  currentAddress?: string;
  disabled?: boolean;
  isManualInput?: boolean; // Add prop to distinguish manual input
}

// Simple wallet detection without heavy dependencies
const detectWallets = () => {
  const wallets = [];
  
  // Check for Phantom
  if (typeof window !== 'undefined' && (window as any).phantom?.solana?.isPhantom) {
    wallets.push({
      name: 'Phantom',
      icon: '👻',
      adapter: (window as any).phantom.solana,
    });
  }
  
  // Check for Solflare
  if (typeof window !== 'undefined' && (window as any).solflare?.isSolflare) {
    wallets.push({
      name: 'Solflare',
      icon: '🔥',
      adapter: (window as any).solflare,
    });
  }
  
  // Check for Backpack
  if (typeof window !== 'undefined' && (window as any).backpack?.isBackpack) {
    wallets.push({
      name: 'Backpack',
      icon: '🎒',
      adapter: (window as any).backpack,
    });
  }
  
  // Check for Glow
  if (typeof window !== 'undefined' && (window as any).glow) {
    wallets.push({
      name: 'Glow',
      icon: '✨',
      adapter: (window as any).glow,
    });
  }

  // Check for MetaMask with Solana support (Snaps or Flask)
  if (typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask) {
    const ethereum = (window as any).ethereum;
    // Check if MetaMask has Solana Snap installed or is Flask version
    if (ethereum.isFlask || ethereum._metamask?.isUnlocked) {
      wallets.push({
        name: 'MetaMask',
        icon: '🦊',
        adapter: {
          connect: async () => {
            try {
              // Try to use Solana Snap if available
              if (ethereum.request) {
                // First, try to check if any Solana-related snaps are installed
                try {
                  const installedSnaps = await ethereum.request({
                    method: 'wallet_getSnaps',
                  });
                  
                  // Look for any Solana-related snaps
                  const solanaSnaps = Object.keys(installedSnaps || {}).filter(snapId => 
                    snapId.includes('solana') || snapId.includes('Solana')
                  );
                  
                  if (solanaSnaps.length > 0) {
                    // Try to get accounts from the first available Solana snap
                    const accounts = await ethereum.request({
                      method: 'wallet_invokeSnap',
                      params: {
                        snapId: solanaSnaps[0],
                        request: { method: 'getAccounts' },
                      },
                    });
                    
                    if (accounts && accounts.length > 0) {
                      return { publicKey: { toString: () => accounts[0] } };
                    }
                  }
                  
                  // If no Solana snaps are installed, try to install one
                  // Note: This is a placeholder for when official Solana snaps are available
                  throw new Error('No Solana Snap installed. Please install a Solana Snap from the MetaMask Snap directory.');
                  
                } catch (snapError) {
                  // If Snap operations fail, provide helpful guidance
                  throw new Error('MetaMask Solana Snap not available. Please use MetaMask Flask with a Solana Snap, or try a native Solana wallet like Phantom.');
                }
              }
              
              // Fallback: Show instructions for manual setup
              throw new Error('Please install Solana Snap for MetaMask or use MetaMask Flask');
            } catch (error) {
              throw error;
            }
          },
          publicKey: null,
        },
      });
    }
  }

  // Check for Coinbase Wallet (has Solana support)
  if (typeof window !== 'undefined' && (window as any).coinbaseSolana) {
    wallets.push({
      name: 'Coinbase Wallet',
      icon: '🔵',
      adapter: (window as any).coinbaseSolana,
    });
  }

  // Check for Trust Wallet (has Solana support)
  if (typeof window !== 'undefined' && (window as any).trustwallet?.solana) {
    wallets.push({
      name: 'Trust Wallet',
      icon: '🛡️',
      adapter: (window as any).trustwallet.solana,
    });
  }

  // Check for Slope Wallet
  if (typeof window !== 'undefined' && (window as any).Slope) {
    wallets.push({
      name: 'Slope',
      icon: '📈',
      adapter: (window as any).Slope,
    });
  }

  // Check for Torus (Web3Auth)
  if (typeof window !== 'undefined' && (window as any).torus?.solana) {
    wallets.push({
      name: 'Torus',
      icon: '🔮',
      adapter: (window as any).torus.solana,
    });
  }

  // Check for Clover Wallet
  if (typeof window !== 'undefined' && (window as any).clover_solana) {
    wallets.push({
      name: 'Clover',
      icon: '🍀',
      adapter: (window as any).clover_solana,
    });
  }

  // Check for Exodus (has Solana support)
  if (typeof window !== 'undefined' && (window as any).exodus?.solana) {
    wallets.push({
      name: 'Exodus',
      icon: '🚀',
      adapter: (window as any).exodus.solana,
    });
  }

  return wallets;
};

export function WalletConnection({ onWalletSelect, currentAddress, disabled = false, isManualInput = false }: WalletConnectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  useEffect(() => {
    // Detect available wallets
    const availableWallets = detectWallets();
    setWallets(availableWallets);
  }, []);

  const connectWallet = async (wallet: any) => {
    setConnecting(wallet.name);
    setError(null);
    
    try {
      const response = await wallet.adapter.connect();
      const publicKey = response.publicKey || wallet.adapter.publicKey;
      
      if (!publicKey) {
        throw new Error('Failed to get public key from wallet');
      }
      
      const address = publicKey.toString();
      
      // Validate the address format
      if (!address || address.length < 32 || address.length > 44) {
        throw new Error('Invalid wallet address received');
      }
      
      setConnectedWallet(address); // Track that this is a wallet connection
      onWalletSelect(address);
      setIsOpen(false);
      
      // Show success message
      console.log(`Successfully connected to ${wallet.name}: ${address}`);
      
    } catch (error) {
      console.error(`Failed to connect to ${wallet.name}:`, error);
      
      let errorMessage = 'Connection failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      // Provide specific error messages for different wallets
      if (wallet.name === 'MetaMask') {
        if (errorMessage.includes('Snap')) {
          alert(`MetaMask Solana support is experimental.\n\n🔧 Current options:\n• Use MetaMask Flask (developer version)\n• Wait for official Solana Snap release\n• Use Phantom or Solflare for full Solana support\n\n💡 Recommended: Use Phantom wallet for the best Solana experience!`);
        } else {
          alert(`MetaMask doesn't fully support Solana yet.\n\n✅ Better options:\n• Phantom - Most popular Solana wallet\n• Solflare - Feature-rich Solana wallet\n• Backpack - Modern Solana wallet\n\nThese wallets are built specifically for Solana!`);
        }
      } else {
        // Generic error message for other wallets
        alert(`Failed to connect to ${wallet.name}.\n\nError: ${errorMessage}\n\nPlease make sure:\n• The wallet is unlocked\n• You approve the connection request\n• The wallet has Solana support enabled\n\nTry refreshing the page if the issue persists.`);
      }
    } finally {
      setConnecting(null);
    }
  };

  const disconnect = () => {
    setConnectedWallet(null);
    onWalletSelect('');
    setError(null);
    
    // Try to disconnect from wallets
    try {
      if ((window as any).phantom?.solana?.disconnect) {
        (window as any).phantom.solana.disconnect();
      }
      if ((window as any).solflare?.disconnect) {
        (window as any).solflare.disconnect();
      }
    } catch (error) {
      console.log('Error disconnecting wallet:', error);
    }
  };

  const copyAddress = () => {
    if (connectedWallet) {
      navigator.clipboard.writeText(connectedWallet);
      // Show a brief notification
      const notification = document.createElement('div');
      notification.textContent = 'Address copied!';
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-out';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
    }
  };

  const openInExplorer = () => {
    if (connectedWallet) {
      window.open(`https://explorer.solana.com/address/${connectedWallet}`, '_blank');
    }
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any form submission
    e.stopPropagation(); // Stop event bubbling
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setError(null);
  };

  // Only show connected state if actually connected via wallet, not manual input
  if (connectedWallet && currentAddress === connectedWallet && !isManualInput) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium text-green-700">
            {connectedWallet.slice(0, 4)}...{connectedWallet.slice(-4)}
          </span>
          <button
            type="button"
            onClick={copyAddress}
            className="p-1 hover:bg-green-100 rounded transition-colors"
            title="Copy address"
          >
            <Copy className="w-3 h-3 text-green-600" />
          </button>
          <button
            type="button"
            onClick={openInExplorer}
            className="p-1 hover:bg-green-100 rounded transition-colors"
            title="View in explorer"
          >
            <ExternalLink className="w-3 h-3 text-green-600" />
          </button>
        </div>
        <button
          type="button"
          onClick={disconnect}
          className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          disabled={disabled}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors h-12"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Connect Wallet</h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              {wallets.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Solana wallets found</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Install a Solana wallet extension to connect.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <a
                      href="https://phantom.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs transition-colors"
                    >
                      👻 Phantom
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://solflare.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs transition-colors"
                    >
                      🔥 Solflare
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://backpack.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors"
                    >
                      🎒 Backpack
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://glow.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs transition-colors"
                    >
                      ✨ Glow
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Already have MetaMask?</p>
                    <div className="flex flex-col gap-2">
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-800 mb-2">
                          <strong>⚠️ MetaMask + Solana is experimental</strong>
                        </p>
                        <p className="text-xs text-amber-700">
                          While MetaMask is exploring Solana support through Snaps, it's not ready for production use. 
                          For the best Solana experience, we recommend using Phantom or Solflare.
                        </p>
                      </div>
                      <a
                        href="https://metamask.io/flask/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs transition-colors"
                      >
                        🦊 Try MetaMask Flask (Experimental)
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    Choose a wallet to connect:
                  </p>
                  {wallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      type="button"
                      onClick={() => connectWallet(wallet)}
                      disabled={connecting === wallet.name}
                      className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-2xl">{wallet.icon}</span>
                      <span className="font-medium text-gray-900">{wallet.name}</span>
                      {connecting === wallet.name && (
                        <div className="ml-auto">
                          <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 