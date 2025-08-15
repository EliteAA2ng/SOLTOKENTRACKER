import { TokenMetadata } from '../types';
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

interface TokenInfoCardProps {
  tokenMetadata: TokenMetadata;
}

export function TokenInfoCard({ tokenMetadata }: TokenInfoCardProps) {
  const formatPrice = (price: number | undefined) => {
    if (!price) return 'N/A';
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  const formatMarketCap = (marketCap: number | undefined) => {
    if (!marketCap) return 'N/A';
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    if (marketCap >= 1e3) return `$${(marketCap / 1e3).toFixed(2)}K`;
    return `$${marketCap.toFixed(0)}`;
  };

  const formatVolume = (volume: number | undefined) => {
    if (!volume) return 'N/A';
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const formatSupply = (supply: number | undefined) => {
    if (!supply) return 'N/A';
    if (supply >= 1e9) return `${(supply / 1e9).toFixed(2)}B`;
    if (supply >= 1e6) return `${(supply / 1e6).toFixed(2)}M`;
    if (supply >= 1e3) return `${(supply / 1e3).toFixed(2)}K`;
    return supply.toFixed(0);
  };

  const isPricePositive = tokenMetadata.priceChange24h && tokenMetadata.priceChange24h > 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
              <span className="text-2xl font-bold text-slate-700">
                {tokenMetadata.symbol?.slice(0, 3) || '?'}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {tokenMetadata.name || 'Unknown Token'}
              </h2>
              <p className="text-slate-600 font-mono text-sm">
                {tokenMetadata.symbol || 'N/A'}
              </p>
            </div>
          </div>
          
          {/* Price and Change */}
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">
              {formatPrice(tokenMetadata.price)}
            </div>
            {tokenMetadata.priceChange24h && (
              <div className={`flex items-center gap-1 text-sm font-medium ${
                isPricePositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {isPricePositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isPricePositive ? '+' : ''}{tokenMetadata.priceChange24h.toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Market Cap</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatMarketCap(tokenMetadata.marketCap)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">24h Volume</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatVolume(tokenMetadata.volume24h)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Supply</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatSupply(tokenMetadata.supply)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">Rank</div>
            <div className="text-lg font-semibold text-slate-900">
              {tokenMetadata.rank ? `#${tokenMetadata.rank}` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Social Links */}
        {(tokenMetadata.website || tokenMetadata.twitter) && (
          <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-slate-200">
            {tokenMetadata.website && (
              <a
                href={tokenMetadata.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Website
              </a>
            )}
            
            {tokenMetadata.twitter && (
              <a
                href={tokenMetadata.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Twitter
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 