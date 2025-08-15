import { useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletContext } from '../contexts/WalletContext';
import { Copy, ExternalLink, Wallet, ChevronDown, X } from 'lucide-react';

interface WalletConnectionProps {
  showFullAddress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function WalletConnection({ showFullAddress = false, size = 'md' }: WalletConnectionProps) {
  const { wallet } = useWallet();
  const {
    isConnected,
    walletAddress,
    isConnecting,
    isAutoConnecting,
    disconnectWallet,
    connectionError,
    clearError
  } = useWalletContext();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'px-3 py-1.5 text-sm',
      text: 'text-sm',
      icon: 'w-4 h-4'
    },
    md: {
      button: 'px-4 py-2 text-sm',
      text: 'text-sm',
      icon: 'w-4 h-4'
    },
    lg: {
      button: 'px-6 py-3 text-base',
      text: 'text-base',
      icon: 'w-5 h-5'
    }
  };

  const config = sizeConfig[size];

  const formatAddress = (address: string) => {
    if (showFullAddress) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      // Could add toast notification here
    }
  };

  const openInExplorer = () => {
    if (walletAddress) {
      window.open(`https://explorer.solana.com/address/${walletAddress}`, '_blank');
    }
  };

  const handleConnect = async () => {
    try {
      clearError();
      setShowWalletModal(true);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      setShowDropdown(false);
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  // Auto-connecting state
  if (isAutoConnecting) {
    return (
      <div className={`inline-flex items-center gap-2 ${config.button} bg-blue-50 text-blue-700 border border-blue-200 rounded-lg cursor-not-allowed`}>
        <div className={`${config.icon} border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin`}></div>
        <span className={config.text}>Auto-connecting...</span>
      </div>
    );
  }

  // Connecting state
  if (isConnecting) {
    return (
      <div className={`inline-flex items-center gap-2 ${config.button} bg-blue-50 text-blue-700 border border-blue-200 rounded-lg cursor-not-allowed`}>
        <div className={`${config.icon} border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin`}></div>
        <span className={config.text}>Connecting...</span>
      </div>
    );
  }

  // Connected state
  if (isConnected && walletAddress) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`inline-flex items-center gap-2 ${config.button} bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors`}
        >
          <div className={`${config.icon} bg-green-500 rounded-full`}></div>
          <span className={`${config.text} font-medium`}>
            {wallet?.adapter.name} {formatAddress(walletAddress)}
          </span>
          <ChevronDown className={`${config.icon} transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* Connected wallet dropdown */}
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Connected to {wallet?.adapter.name}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-mono break-all">
                  {walletAddress}
                </div>
              </div>
              
              <div className="p-2">
                <button
                  onClick={copyAddress}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy Address
                </button>
                
                <button
                  onClick={openInExplorer}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View in Explorer
                </button>
                
                <hr className="my-2" />
                
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Not connected state
  return (
    <>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={`inline-flex items-center gap-2 ${config.button} bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
      >
        <Wallet className={config.icon} />
        <span className={config.text}>Connect Wallet</span>
      </button>

      {/* Connection error */}
      {connectionError && (
        <div className="mt-2 text-xs text-red-600">
          {connectionError}
        </div>
      )}

      {/* Wallet selection modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Connect Wallet</h2>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="wallet-adapter-button-trigger">
              <WalletMultiButton 
                style={{
                  backgroundColor: '#7c3aed',
                  borderRadius: '0.5rem',
                  height: '3rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  width: '100%'
                }}
              />
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              By connecting a wallet, you agree to the Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      )}
    </>
  );
} 