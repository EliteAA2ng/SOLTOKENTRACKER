import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWalletContext } from '../contexts/WalletContext';
import { Copy, ExternalLink, Wallet, X } from 'lucide-react';

export const WalletConnectionManager: React.FC = () => {
  const { 
    isConnected, 
    walletAddress, 
    handleConnect, 
    handleDisconnect,
    showConnectModal,
    setShowConnectModal,
    isAutoConnecting 
  } = useWalletContext();

  const { wallet } = useWallet();

  const copyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      // Could add a toast notification here
    }
  };

  const openInExplorer = () => {
    if (walletAddress) {
      window.open(`https://explorer.solana.com/address/${walletAddress}`, '_blank');
    }
  };

  // Connected state - show wallet info and disconnect button
  if (isConnected && walletAddress) {
    return (
      <div className="flex items-center gap-3">
        {/* Wallet info */}
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              {wallet?.adapter.name || 'Connected'}
            </span>
            <span className="text-xs text-green-600 font-mono">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-2">
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
        </div>

        {/* Disconnect button */}
        <button
          type="button"
          onClick={handleDisconnect}
          className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Auto-connecting state
  if (isAutoConnecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-blue-700">Auto-connecting...</span>
      </div>
    );
  }

  // Disconnected state - show connect button
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleConnect}
        className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>

      {/* Wallet Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Connect Wallet</h3>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Choose a wallet to connect to this dApp:
              </p>
              
              {/* Use the standard WalletMultiButton but hide it and trigger programmatically */}
              <div className="wallet-adapter-modal-wrapper">
                <WalletMultiButton 
                  className="!w-full !justify-center !bg-violet-600 !hover:bg-violet-700"
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                By connecting, you agree to this dApp's terms of service.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 