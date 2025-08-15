import { useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Copy, ExternalLink } from 'lucide-react';

interface WalletConnectionProps {
  onWalletSelect: (address: string) => void;
  isAutoConnecting?: boolean;
}

export function WalletConnection({ onWalletSelect, isAutoConnecting = false }: WalletConnectionProps) {
  const { publicKey, connected, disconnect, connecting } = useWallet();
  const lastConnectedAddress = useRef<string | null>(null);

  // Update parent component when wallet connection changes
  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toString();
      lastConnectedAddress.current = address;
      onWalletSelect(address);
    } else if (!connected && lastConnectedAddress.current) {
      // Only clear if we had a connected address before
      // This prevents clearing manually typed addresses
      lastConnectedAddress.current = null;
      onWalletSelect('');
    }
    // If not connected and no previous connection, don't clear anything
  }, [connected, publicKey, onWalletSelect]);

  const copyAddress = async () => {
    if (publicKey) {
      const address = publicKey.toString();
      try {
        await navigator.clipboard.writeText(address);
        console.log('Address copied to clipboard');
      } catch (error) {
        console.error('Failed to copy address:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = address;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    }
  };

  const openInExplorer = () => {
    if (publicKey) {
      const address = publicKey.toString();
      window.open(`https://explorer.solana.com/address/${address}`, '_blank');
    }
  };

  if (connected && publicKey) {
    const address = publicKey.toString();
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-green-700">
            {address.slice(0, 4)}...{address.slice(-4)}
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
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Show connecting status during auto-connect or manual connect
  const isConnecting = connecting || isAutoConnecting;

  return (
    <div className="wallet-adapter-button-trigger">
      {isConnecting ? (
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-400 text-white rounded-lg font-medium cursor-not-allowed"
          style={{
            borderRadius: '0.5rem',
            height: '3rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            padding: '0 1rem',
          }}
        >
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          {isAutoConnecting ? 'Auto-connecting...' : 'Connecting...'}
        </button>
      ) : (
        <WalletMultiButton 
          style={{
            backgroundColor: '#7c3aed',
            borderRadius: '0.5rem',
            height: '3rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            padding: '0 1rem',
          }}
        />
      )}
    </div>
  );
} 