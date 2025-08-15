import { useState, useEffect } from 'react';
import { Search, AlertTriangle, Info } from 'lucide-react';
import { COMMON_TOKENS, DEFAULT_CONFIG } from '../config';
import { WalletConnection } from './WalletConnection';

interface WalletInputProps {
  onSubmit: (data: {
    tokenMint: string;
    walletAddress?: string;
    heliusKey: string;
    seconds: number;
    walletAddressSource?: 'manual' | 'connected' | null;
  }) => void;
  loading: boolean;
  isAutoConnecting?: boolean;
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

export default function WalletInput({ onSubmit, loading, isAutoConnecting = false }: WalletInputProps) {
  const savedData = loadFormData();
  
  const [tokenMint, setTokenMint] = useState(savedData.tokenMint || '');
  const [walletAddress, setWalletAddress] = useState(savedData.walletAddress || '');
  const [heliusKey, setHeliusKey] = useState(savedData.heliusKey || DEFAULT_CONFIG.defaultHeliusKey);
  const [seconds, setSeconds] = useState(savedData.seconds || 600);
  const [error, setError] = useState('');
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [showRestoredMessage, setShowRestoredMessage] = useState(false);
  const [walletAddressSource, setWalletAddressSource] = useState<'manual' | 'connected' | null>(
    savedData.walletAddressSource || null
  );

  // Initialize form with saved data on component mount
  useEffect(() => {
    const saved = loadFormData();
    let hasRestoredData = false;
    
    if (saved.tokenMint) {
      setTokenMint(saved.tokenMint);
      hasRestoredData = true;
    }
    if (saved.walletAddress) {
      setWalletAddress(saved.walletAddress);
      hasRestoredData = true;
    }
    if (saved.walletAddressSource) {
      setWalletAddressSource(saved.walletAddressSource);
    }
    if (saved.heliusKey && saved.heliusKey !== DEFAULT_CONFIG.defaultHeliusKey) {
      setHeliusKey(saved.heliusKey);
      hasRestoredData = true;
    }
    if (saved.seconds && saved.seconds !== 600) {
      setSeconds(saved.seconds);
      hasRestoredData = true;
    }
    
    setIsFormInitialized(true);
    
    // Show restored message if we restored any data
    if (hasRestoredData) {
      setShowRestoredMessage(true);
      // Hide the message after 3 seconds
      setTimeout(() => setShowRestoredMessage(false), 3000);
    }
  }, []);

  // Save form data whenever fields change (but only after initialization)
  useEffect(() => {
    if (isFormInitialized) {
      const formData = { 
        tokenMint, 
        walletAddress, 
        heliusKey, 
        seconds,
        walletAddressSource 
      };
      saveFormData(formData);
    }
  }, [tokenMint, walletAddress, heliusKey, seconds, walletAddressSource, isFormInitialized]);

  // Handle wallet connection - only update if not manually typing
  const handleWalletSelect = (address: string) => {
    // If user is currently manually typing (manual source), don't override with wallet connection
    // unless the address is empty (wallet disconnected)
    if (walletAddressSource === 'manual' && address !== '') {
      // Don't override manual input with wallet connection
      return;
    }
    
    setWalletAddress(address);
    // If wallet provides an address, it's connected; if empty, it's disconnected
    setWalletAddressSource(address ? 'connected' : null);
  };

  // Handle manual wallet address input
  const handleManualWalletInput = (address: string) => {
    setWalletAddress(address);
    
    // Debounce the source setting to prevent conflicts with wallet connection
    setTimeout(() => {
      // If user is manually typing, mark as manual input
      if (address.trim() !== '') {
        setWalletAddressSource('manual');
      } else {
        setWalletAddressSource(null);
      }
    }, 100); // Small delay to prevent race conditions
  };

  const validateAddress = (addr: string): boolean => {
    if (!addr.trim()) return false;
    if (addr.length < 32 || addr.length > 44) return false;
    
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(addr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateAddress(tokenMint)) {
      setError('Invalid token mint address format. Expected 32-44 character base58 string.');
      return;
    }

    // Only validate wallet address if it's not empty (since it's optional)
    if (walletAddress && walletAddress.trim() && !validateAddress(walletAddress.trim())) {
      setError('Invalid wallet address format. Expected 32-44 character base58 string.');
      return;
    }

    if (seconds < 5 || seconds > 86400) {
      setError('Lookback period must be between 5 and 86400 seconds (24 hours).');
      return;
    }

    // Use the provided heliusKey or fall back to default
    const finalHeliusKey = heliusKey.trim() || DEFAULT_CONFIG.defaultHeliusKey;
    
    // Clean up wallet address - if it's empty or just whitespace, pass empty string
    const cleanWalletAddress = walletAddress.trim() || '';
    
    onSubmit({ 
      tokenMint: tokenMint.trim(), 
      walletAddress: cleanWalletAddress, 
      heliusKey: finalHeliusKey, 
      seconds,
      walletAddressSource 
    });
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
          
          {/* Auto-connecting indicator */}
          {isAutoConnecting && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span>Auto-connecting to wallet...</span>
            </div>
          )}
          
          {/* Form data restored indicator */}
          {showRestoredMessage && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <div className="w-4 h-4 text-green-600">✓</div>
              <span>Previous form data restored</span>
            </div>
          )}
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
                  onClick={() => setTokenMint(address)}
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
                  onChange={(e) => handleManualWalletInput(e.target.value)}
                  placeholder="Filter by specific wallet address"
                  className="w-full h-12 px-4 pr-10 text-sm border border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none transition-all placeholder:text-slate-400 font-mono"
                  disabled={loading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className={`w-2 h-2 rounded-full ${
                    walletAddressSource === 'connected' 
                      ? 'bg-green-400' 
                      : walletAddressSource === 'manual'
                      ? 'bg-blue-400'
                      : 'bg-slate-300'
                  }`}></div>
                </div>
              </div>
              <WalletConnection 
                onWalletSelect={handleWalletSelect}
                isAutoConnecting={isAutoConnecting}
              />
            </div>
            <p className="text-xs text-slate-500">
              {walletAddressSource === 'connected' 
                ? '🟢 Connected wallet address (will update if wallet changes)'
                : walletAddressSource === 'manual'
                ? '🔵 Manually entered address (will be maintained)'
                : 'Connect your wallet or manually enter an address to filter transfers'
              }
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
              Default key included. Get your own for higher rate limits at <a href="https://helius.xyz" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700">helius.xyz</a>
            </p>
          </div>

          {/* Lookback Period (seconds) */}
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
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !tokenMint.trim()}
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Analyze Transfers
              </>
            )}
          </button>
        </form>

        {/* Info Section */}
        <div className="mt-8 p-4 bg-slate-50 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600 space-y-2">
              <p className="font-medium">How it works:</p>
              <ul className="space-y-1 text-xs">
                <li>• Analyzes on-chain token transfers for any SPL token</li>
                <li>• Shows both incoming and outgoing transfers</li>
                <li>• Uses Helius RPC for enhanced performance and reliability</li>
                <li>• Shorter lookback periods provide faster, more focused results</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 