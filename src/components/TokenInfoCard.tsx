import { TokenMetadata } from '../types';
import { ExternalLink, TrendingUp, TrendingDown, Globe, Twitter, MessageCircle, Users } from 'lucide-react';

interface TokenInfoCardProps {
  tokenMetadata: TokenMetadata;
}

export function TokenInfoCard({ tokenMetadata }: TokenInfoCardProps) {
  const formatNumber = (num: number | undefined, decimals = 2): string => {
    if (num === undefined || num === null) return 'N/A';
    
    if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(decimals)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(decimals)}M`;
    } else if (num >= 1e3) {
      return `$${(num / 1e3).toFixed(decimals)}K`;
    } else if (num >= 1) {
      return `$${num.toFixed(decimals)}`;
    } else if (num > 0) {
      return `$${num.toFixed(6)}`;
    }
    return '$0.00';
  };

  const formatPercentage = (percent: number | undefined): string => {
    if (percent === undefined || percent === null) return 'N/A';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const formatSupply = (supply: number | undefined): string => {
    if (supply === undefined || supply === null) return 'N/A';
    
    if (supply >= 1e9) {
      return `${(supply / 1e9).toFixed(2)}B`;
    } else if (supply >= 1e6) {
      return `${(supply / 1e6).toFixed(2)}M`;
    } else if (supply >= 1e3) {
      return `${(supply / 1e3).toFixed(2)}K`;
    }
    return supply.toFixed(0);
  };

  const priceChangeColor = tokenMetadata.priceChange24h && tokenMetadata.priceChange24h >= 0 
    ? 'text-green-600' : 'text-red-600';
  
  const PriceChangeIcon = tokenMetadata.priceChange24h && tokenMetadata.priceChange24h >= 0 
    ? TrendingUp : TrendingDown;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header with token info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          {tokenMetadata.logoURI && (
            <img 
              src={tokenMetadata.logoURI} 
              alt={`${tokenMetadata.symbol} logo`}
              className="w-16 h-16 rounded-full border-2 border-white shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-slate-900">{tokenMetadata.name}</h2>
              {tokenMetadata.rank && (
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
                  #{tokenMetadata.rank}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-mono text-lg">{tokenMetadata.symbol}</span>
              <span className="text-sm">•</span>
              <span className="text-sm font-mono">{tokenMetadata.mint.slice(0, 8)}...{tokenMetadata.mint.slice(-8)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Price and market data */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Current Price */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-600 mb-1">Current Price</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {tokenMetadata.price ? formatNumber(tokenMetadata.price, 6) : 'N/A'}
              </span>
              {tokenMetadata.priceChange24h !== undefined && (
                <div className={`flex items-center gap-1 ${priceChangeColor}`}>
                  <PriceChangeIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {formatPercentage(tokenMetadata.priceChange24h)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Market Cap */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-600 mb-1">Market Cap</h3>
            <span className="text-xl font-bold text-slate-900">
              {formatNumber(tokenMetadata.marketCap)}
            </span>
          </div>

          {/* 24h Volume */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-600 mb-1">24h Volume</h3>
            <span className="text-xl font-bold text-slate-900">
              {formatNumber(tokenMetadata.volume24h)}
            </span>
          </div>

          {/* Total Supply */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-600 mb-1">Total Supply</h3>
            <span className="text-xl font-bold text-slate-900">
              {formatSupply(tokenMetadata.supply)}
            </span>
          </div>
        </div>

        {/* Description */}
        {tokenMetadata.description && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">About</h3>
            <p className="text-slate-700 leading-relaxed">
              {tokenMetadata.description.length > 300 
                ? `${tokenMetadata.description.slice(0, 300)}...` 
                : tokenMetadata.description}
            </p>
          </div>
        )}

        {/* Social Links */}
        {(tokenMetadata.website || tokenMetadata.twitter || tokenMetadata.telegram || tokenMetadata.discord) && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Links</h3>
            <div className="flex flex-wrap gap-3">
              {tokenMetadata.website && (
                <a
                  href={tokenMetadata.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Website
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {tokenMetadata.twitter && (
                <a
                  href={tokenMetadata.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {tokenMetadata.telegram && (
                <a
                  href={tokenMetadata.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Telegram
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {tokenMetadata.discord && (
                <a
                  href={tokenMetadata.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Discord
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 