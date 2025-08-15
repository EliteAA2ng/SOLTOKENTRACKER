import { useState } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { COMMON_TOKENS } from '../config';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  setTokenMint, 
  setWalletAddress, 
  setHeliusKey, 
  setSeconds,
  setIsWalletConnected 
} from '../store/formSlice';

interface WalletInputProps {
  onSubmit: (data: {
    tokenMint: string;
    walletAddress?: string;
    heliusKey: string;
    seconds: number;
  }) => void;
  loading: boolean;
}

export default function WalletInput({ onSubmit, loading }: WalletInputProps) {
  // Get form state from Redux store
  const dispatch = useAppDispatch();
  const tokenMint = useAppSelector((state) => state.form.tokenMint);
  const walletAddress = useAppSelector((state) => state.form.walletAddress);
  const heliusKey = useAppSelector((state) => state.form.heliusKey);
  const seconds = useAppSelector((state) => state.form.seconds);
  const isWalletConnected = useAppSelector((state) => state.form.isWalletConnected);
  
  const [error, setError] = useState('');

  const validateAddress = (addr: string): boolean => {
    if (!addr.trim()) return false;
    if (addr.length < 32 || addr.length > 44) return false;
    
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(addr);
  };

  const validateHeliusKey = (key: string): boolean => {
    // Helius keys are typically UUID format
    if (!key.trim()) return true; // Optional field, empty is valid
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(key);
  };

  const validateSeconds = (secs: number): boolean => {
    return secs >= 5 && secs <= 86400;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');

    if (!validateAddress(tokenMint)) {
      setError('Invalid token address format');
      return;
    }

    if (walletAddress && !validateAddress(walletAddress)) {
      setError('Invalid wallet address format');
      return;
    }

    if (!validateSeconds(seconds)) {
      setError('Time period must be between 5 seconds and 24 hours');
      return;
    }

    if (!validateHeliusKey(heliusKey)) {
      setError('Invalid API key format');
      return;
    }

    // Use the provided heliusKey
    onSubmit({ 
      tokenMint: tokenMint.trim(), 
      walletAddress: walletAddress.trim(), 
      heliusKey: heliusKey.trim(), 
      seconds 
    });
  };

  // Handle token selection
  const handleTokenSelect = (address: string) => {
    dispatch(setTokenMint(address));
    setError(''); // Clear any existing errors
  };

  // Handle input changes
  const handleTokenMintChange = (value: string) => {
    dispatch(setTokenMint(value));
  };

  const handleWalletAddressChange = (value: string) => {
    dispatch(setWalletAddress(value));
    dispatch(setIsWalletConnected(false)); // Mark as manual input
  };

  const handleHeliusKeyChange = (value: string) => {
    dispatch(setHeliusKey(value));
  };

  const handleSecondsChange = (value: number) => {
    dispatch(setSeconds(value));
  };

  // Determine validation states - only show validation if field has content
  const getTokenMintValidation = () => {
    if (!tokenMint || tokenMint.trim() === '') return null; // Don't show any dot if empty
    return validateAddress(tokenMint);
  };

  const getWalletAddressValidation = () => {
    if (isWalletConnected) return true; // Always valid if connected
    if (!walletAddress || walletAddress.trim() === '') return null; // Don't show any dot if empty
    return validateAddress(walletAddress);
  };

  const getHeliusKeyValidation = () => {
    if (!heliusKey || heliusKey.trim() === '') return true; // Empty is valid for optional field
    return validateHeliusKey(heliusKey);
  };

  const isTokenMintValid = getTokenMintValidation();
  const isWalletAddressValid = getWalletAddressValidation();
  const isHeliusKeyValid = getHeliusKeyValidation();
  const isSecondsValid = validateSeconds(seconds);

  return (
    <div className="min-h-screen flex items-start justify-center p-4 pt-24">
      <div className="w-full max-w-lg">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Token Address */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-900 block">
              Token Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={tokenMint}
                onChange={(e) => handleTokenMintChange(e.target.value)}
                placeholder="Token mint address"
                className="w-full h-12 px-4 pr-10 text-sm border border-slate-300 rounded-lg focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition-all placeholder:text-slate-400 font-mono bg-white"
                disabled={loading}
                required
              />
              {isTokenMintValid !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className={`w-2 h-2 rounded-full ${
                    isTokenMintValid ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
              )}
            </div>
            {/* Quick Select Tokens */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(COMMON_TOKENS).slice(0, 6).map(([symbol, address]) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => handleTokenSelect(address)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  disabled={loading}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Wallet Address */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-900 block">
              Wallet Address <span className="text-slate-500 text-xs font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => handleWalletAddressChange(e.target.value)}
                placeholder={isWalletConnected ? "Connected wallet" : "Filter by wallet address"}
                className={`w-full h-12 px-4 pr-10 text-sm border border-slate-300 rounded-lg focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition-all placeholder:text-slate-400 font-mono ${
                  isWalletConnected ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                }`}
                disabled={loading || isWalletConnected}
              />
              {isWalletAddressValid !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className={`w-2 h-2 rounded-full ${
                    isWalletAddressValid ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
              )}
            </div>
          </div>

          {/* Time Period */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-900 block">
              Time Period
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: '30s', value: 30 },
                { label: '10m', value: 600 },
                { label: '1h', value: 3600 },
                { label: '24h', value: 86400 }
              ].map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSecondsChange(value)}
                  className={`px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    seconds === value
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                onChange={(e) => handleSecondsChange(parseInt(e.target.value) || 600)}
                min="5"
                max="86400"
                className="w-full h-12 px-4 pr-10 text-sm border border-slate-300 rounded-lg focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition-all bg-white"
                disabled={loading}
              />
              {isSecondsValid !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className={`w-2 h-2 rounded-full ${
                    isSecondsValid ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
              )}
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-900 block">
              API Key <span className="text-slate-500 text-xs font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={heliusKey}
                onChange={(e) => handleHeliusKeyChange(e.target.value)}
                placeholder="Default provided"
                className="w-full h-12 px-4 pr-10 text-sm border border-slate-300 rounded-lg focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition-all placeholder:text-slate-400 font-mono bg-white"
                disabled={loading}
              />
              {isHeliusKeyValid !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className={`w-2 h-2 rounded-full ${
                    isHeliusKeyValid ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !tokenMint}
            className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-medium rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
      </div>
    </div>
  );
} 