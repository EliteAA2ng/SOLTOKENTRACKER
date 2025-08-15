import { useState, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, Info } from 'lucide-react';
import { COMMON_TOKENS, DEFAULT_CONFIG } from '../config';
import { WalletConnection } from './WalletConnection';

interface WalletInputProps {
  onSubmit: (data: {
    tokenMint: string;
    walletAddress?: string;
    heliusKey: string;
    seconds: number;
  }) => void;
  loading: boolean;
}

// Form persistence helper
const FORM_STORAGE_KEY = 'solana-tracker-form';

const saveFormData = (data: any) => {
  try {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save form data:', error);
  }
};

const loadFormData = () => {
  try {
    const saved = localStorage.getItem(FORM_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.warn('Failed to load form data:', error);
    return {};
  }
};

export default function WalletInput({ onSubmit, loading }: WalletInputProps) {
  const savedData = loadFormData();
  
  const [tokenMint, setTokenMint] = useState(savedData.tokenMint || '');
  const [walletAddress, setWalletAddress] = useState(savedData.walletAddress || '');
  const [heliusKey, setHeliusKey] = useState(savedData.heliusKey || DEFAULT_CONFIG.defaultHeliusKey);
  const [seconds, setSeconds] = useState(savedData.seconds || 600);
  const [error, setError] = useState('');
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  // Save form data whenever fields change
  useEffect(() => {
    const formData = { tokenMint, walletAddress, heliusKey, seconds };
    saveFormData(formData);
  }, [tokenMint, walletAddress, heliusKey, seconds]);

  const validateAddress = (addr: string): boolean => {
    if (!addr.trim()) return false;
    if (addr.length < 32 || addr.length > 44) return false;
    
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(addr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if wallet is being connected
    if (isConnectingWallet) {
      console.log('Form submission blocked: wallet connection in progress');
      return;
    }
    
    setError('');

    if (!validateAddress(tokenMint)) {
      setError('Invalid token mint address format. Expected 32-44 character base58 string.');
      return;
    }

    if (walletAddress && !validateAddress(walletAddress)) {
      setError('Invalid wallet address format. Expected 32-44 character base58 string.');
      return;
    }

    if (seconds < 5 || seconds > 86400) {
      setError('Lookback period must be between 5 and 86400 seconds (24 hours).');
      return;
    }

    // Use the provided heliusKey or fall back to default
    const finalHeliusKey = heliusKey.trim() || DEFAULT_CONFIG.defaultHeliusKey;
    onSubmit({ tokenMint: tokenMint.trim(), walletAddress: walletAddress.trim(), heliusKey: finalHeliusKey, seconds });
  };

  // Handle wallet selection with proper state management
  const handleWalletSelect = useCallback((address: string) => {
    setIsConnectingWallet(true);
    setWalletAddress(address);
    // Reset the connecting state after a brief delay
    setTimeout(() => setIsConnectingWallet(false), 100);
  }, []);

  // Handle token selection
  const handleTokenSelect = (address: string) => {
    setTokenMint(address);
    setError(''); // Clear any existing errors
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Solana Token Tracker
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Comprehensive on-chain analysis for any Solana SPL token transfers
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Token Mint Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 block">
              Token Mint Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={tokenMint}
                onChange={(e) => setTokenMint(e.target.value)}
                placeholder="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                className="w-full h-12 px-4 pr-10 text-sm border border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none transition-all placeholder:text-slate-400 font-mono"
                disabled={loading}
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Enter any Solana SPL token mint address (e.g., USDC, BONK, USDT)
            </p>
            {/* Quick Select Common Tokens */}
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(COMMON_TOKENS).slice(0, 4).map(([symbol, address]) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => handleTokenSelect(address)}
                  className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  disabled={loading}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 block">
              Wallet Address (Optional)
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Filter by specific wallet address"
                className="w-full h-12 px-4 pr-10 text-sm border border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none transition-all placeholder:text-slate-400 font-mono"
                disabled={loading || isConnectingWallet}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
              </div>
              </div>
              <WalletConnection 
                onWalletSelect={handleWalletSelect}
                currentAddress={walletAddress}
                disabled={loading}
              />
            </div>
            <p className="text-xs text-slate-500">
              Connect your wallet or manually enter an address to filter transfers
            </p>
          </div>

          {/* Helius API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 block">
              Helius API Key (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={heliusKey}
                onChange={(e) => setHeliusKey(e.target.value)}
                placeholder="Default key provided - enter your own for higher limits"
                className="w-full h-12 px-4 pr-10 text-sm border border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none transition-all placeholder:text-slate-400 font-mono"
                disabled={loading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Default key included. Get your own for higher rate limits at{' '}
              <a
                href="https://helius.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:text-violet-700"
              >
                helius.xyz
              </a>
            </p>
          </div>

          {/* Lookback Period */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 block">
              Lookback Period
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: '30s', value: 30 },
                { label: '10min', value: 600 },
                { label: '1hr', value: 3600 },
                { label: '24hr', value: 86400 }
              ].map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSeconds(value)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    seconds === value
                      ? 'bg-violet-100 text-violet-700 border border-violet-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                  }`}
                  disabled={loading}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="number"
                value={seconds}
                onChange={(e) => setSeconds(parseInt(e.target.value) || 600)}
                min="5"
                max="86400"
                className="w-full h-12 px-4 text-sm border border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none transition-all"
                disabled={loading}
              />
            </div>
            <p className="text-xs text-slate-500">
              How far back to look for transfers (5 seconds to 24 hours)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || isConnectingWallet || !tokenMint}
            className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-violet-400 disabled:to-purple-400 text-white font-medium rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Analyzing...</span>
              </>
            ) : isConnectingWallet ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Connecting Wallet...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Analyze Token</span>
              </>
            )}
          </button>
        </form>

        {/* Info Section */}
        <div className="mt-8 p-4 bg-slate-50 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-1">
              <p>• Tracks all transfers for any SPL token</p>
              <p>• Optional wallet filtering for specific addresses</p>
              <p>• Real-time streaming of new transfers</p>
              <p>• Comprehensive token information and market data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 