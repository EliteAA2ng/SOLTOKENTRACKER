import { useState, useEffect } from 'react';
import { Search, AlertTriangle, Info } from 'lucide-react';
import { COMMON_TOKENS, DEFAULT_CONFIG } from '../config';
import { WalletConnectionManager } from './WalletConnectionManager';
import { useWalletContext } from '../contexts/WalletContext';

interface WalletInputProps {
  onSubmit: (data: {
    tokenMint: string;
    walletAddress?: string;
    heliusKey: string;
    seconds: number;
    walletAddressSource?: 'manual' | 'connected' | null;
  }) => void;
  loading: boolean;
}

const FORM_STORAGE_KEY = 'solana-tracker-form';

// Change from localStorage to sessionStorage for session-only persistence
const saveFormData = (data: any) => {
  try {
    sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save form data to sessionStorage:', error);
  }
};

const loadFormData = () => {
  try {
    const saved = sessionStorage.getItem(FORM_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.warn('Failed to load form data from sessionStorage:', error);
    return {};
  }
};

export default function WalletInput({ onSubmit, loading }: WalletInputProps) {
  const { 
    isConnected, 
    walletAddress, 
    manualAddress, 
    setManualAddress, 
    isWalletInputDisabled,
    getEffectiveAddress 
  } = useWalletContext();
  
  const [tokenMint, setTokenMint] = useState('');
  const [heliusKey, setHeliusKey] = useState('');
  const [seconds, setSeconds] = useState(600);
  const [error, setError] = useState('');
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [showRestoredMessage, setShowRestoredMessage] = useState(false);

  // Initialize form with saved data on component mount
  useEffect(() => {
    const saved = loadFormData();
    let hasRestoredData = false;
    
    if (saved.tokenMint) { 
      setTokenMint(saved.tokenMint); 
      hasRestoredData = true; 
    }
    if (saved.heliusKey && saved.heliusKey !== DEFAULT_CONFIG.defaultHeliusKey) { 
      setHeliusKey(saved.heliusKey); 
      hasRestoredData = true; 
    }
    if (saved.seconds && saved.seconds !== 600) { 
      setSeconds(saved.seconds); 
      hasRestoredData = true; 
    }
    
    // Only restore manual address if no wallet is connected
    if (saved.manualAddress && !isConnected) {
      setManualAddress(saved.manualAddress);
      hasRestoredData = true;
    }
    
    setIsFormInitialized(true);
    
    if (hasRestoredData) {
      setShowRestoredMessage(true);
      setTimeout(() => setShowRestoredMessage(false), 3000);
    }
  }, [isConnected, setManualAddress]);

  // Save form data whenever fields change (but only after initialization)
  useEffect(() => {
    if (isFormInitialized) {
      const formData = { 
        tokenMint, 
        heliusKey, 
        seconds,
        manualAddress: isConnected ? '' : manualAddress, // Don't save manual address if wallet connected
      };
      saveFormData(formData);
    }
  }, [tokenMint, heliusKey, seconds, manualAddress, isFormInitialized, isConnected]);

  // Handle manual wallet address input
  const handleManualWalletInput = (address: string) => {
    if (!isConnected) {
      setManualAddress(address);
    }
  };

  const validateAddress = (addr: string): boolean => {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateAddress(tokenMint)) {
      setError('Please enter a valid token mint address');
      return;
    }

    const effectiveAddress = getEffectiveAddress();
    if (effectiveAddress && !validateAddress(effectiveAddress)) {
      setError('Please enter a valid wallet address');
      return;
    }

    if (seconds < 5 || seconds > 86400) {
      setError('Lookback period must be between 5 seconds and 24 hours');
      return;
    }

    const finalHeliusKey = heliusKey.trim() || DEFAULT_CONFIG.defaultHeliusKey;
    
    onSubmit({
      tokenMint: tokenMint.trim(),
      walletAddress: effectiveAddress,
      heliusKey: finalHeliusKey, 
      seconds,
      walletAddressSource: isConnected ? 'connected' : 'manual'
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Solana Token Tracker</h1>
          <p className="text-slate-600">Comprehensive on-chain analysis for any Solana SPL token transfers</p>
          
          {/* Form data restored indicator */}
          {showRestoredMessage && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <div className="w-4 h-4 text-green-600">✓</div>
              <span>Previous form data restored</span>
            </div>
          )}

          {/* Debug section for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
              <div className="font-medium text-gray-700 mb-2">Debug Info:</div>
              <div className="space-y-1 text-gray-600">
                <div>Connected: {isConnected ? '✅ Yes' : '❌ No'}</div>
                <div>Manual Address: {manualAddress || 'None'}</div>
                <div>Effective Address: {getEffectiveAddress() || 'None'}</div>
                <div>Wallet Input Disabled: {isWalletInputDisabled ? 'Yes' : 'No'}</div>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem('autoConnectAttempted');
                    window.location.reload();
                  }}
                  className="mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                >
                  Reset & Test Auto-Connect
                </button>
              </div>
            </div>
          )}
        </div>

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
                <div className={`w-2 h-2 rounded-full ${tokenMint ? 'bg-green-400' : 'bg-slate-300'}`}></div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Enter any Solana SPL token mint address (e.g., USDC, BONK, USDT)
            </p>
            
            {/* Quick select buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(COMMON_TOKENS).map(([symbol, address]) => (
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
                  value={manualAddress || walletAddress || ''}
                  onChange={(e) => handleManualWalletInput(e.target.value)}
                  placeholder={
                    isConnected 
                      ? 'Connected wallet address' 
                      : 'Filter by specific wallet address'
                  }
                  className={`w-full h-12 px-4 pr-10 text-sm border border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none transition-all placeholder:text-slate-400 font-mono ${
                    isConnected 
                      ? 'bg-green-50 border-green-200 cursor-not-allowed' 
                      : 'bg-white'
                  }`}
                  disabled={loading || isWalletInputDisabled}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? 'bg-green-400'
                      : 'bg-blue-400'
                  }`}></div>
                </div>
              </div>
              <WalletConnectionManager />
            </div>
            <p className="text-xs text-slate-500">
              {isConnected
                ? '🟢 Wallet connected (disconnect to enable manual entry)'
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
                className="w-full h-12 px-4 pr-10 text-sm border border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none transition-all placeholder:text-slate-400"
                disabled={loading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className={`w-2 h-2 rounded-full ${heliusKey ? 'bg-green-400' : 'bg-slate-300'}`}></div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Default key included. Get your own for higher rate limits at <a href="https://helius.xyz" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700">helius.xyz</a>
            </p>
          </div>

          {/* Lookback Period */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 block">
              Lookback Period
            </label>
            
            {/* Quick select buttons */}
            <div className="grid grid-cols-4 gap-2">
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
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    seconds === value
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  disabled={loading}
                >
                  {label}
                </button>
              ))}
            </div>
            
            {/* Custom input */}
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
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
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
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Analyze Transfers</span>
              </>
            )}
          </button>
        </form>

        {/* Info Section */}
        <div className="mt-8 p-4 bg-slate-50 rounded-xl">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-600">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="space-y-1">
                <li>• Analyzes on-chain token transfers for any SPL token</li>
                <li>• Shows recent transfers within your specified time window</li>
                <li>• Optionally filter by wallet address to see specific activity</li>
                <li>• Uses multiple data sources for comprehensive coverage</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 