import { TokenMetadata } from '../types';
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

interface TokenInfoCardProps {
  tokenMetadata: TokenMetadata;
}

export function TokenInfoCard({ tokenMetadata }: TokenInfoCardProps) {
  const [logoError, setLogoError] = useState(false);

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return 'N/A';
    if (price < 0.01) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(2)}`;
  };

  const formatMarketCap = (marketCap: number | null | undefined) => {
    if (!marketCap) return 'N/A';
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    if (marketCap >= 1e3) return `$${(marketCap / 1e3).toFixed(2)}K`;
    return `$${marketCap.toFixed(0)}`;
  };

  const formatVolume = (volume: number | null | undefined) => {
    if (!volume) return 'N/A';
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const formatSupply = (supply: number | null | undefined) => {
    if (!supply) return 'N/A';
    if (supply >= 1e9) return `${(supply / 1e9).toFixed(2)}B`;
    if (supply >= 1e6) return `${(supply / 1e6).toFixed(2)}M`;
    if (supply >= 1e3) return `${(supply / 1e3).toFixed(2)}K`;
    return supply.toFixed(0);
  };

  const getPriceChangeColor = (change: number | null | undefined) => {
    if (!change) return 'text-slate-500';
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPriceChangeIcon = (change: number | null | undefined) => {
    if (!change) return null;
    return change >= 0 ? 
      <TrendingUp className="w-4 h-4" /> : 
      <TrendingDown className="w-4 h-4" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
            {tokenMetadata.logoURI && !logoError ? (
              <img 
                src={tokenMetadata.logoURI} 
                alt={`${tokenMetadata.symbol} logo`}
                className="w-16 h-16 rounded-full object-cover"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-2xl font-bold text-slate-600">
                {tokenMetadata.symbol?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              {tokenMetadata.name || 'Unknown Token'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium text-slate-600">
                {tokenMetadata.symbol || 'N/A'}
              </span>
              {tokenMetadata.rank && (
                <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded">
                  #{tokenMetadata.rank}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-slate-500 mb-1">Price</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-900">
                {formatPrice(tokenMetadata.price)}
              </span>
              {tokenMetadata.priceChange24h && (
                <div className={`flex items-center gap-1 text-sm ${getPriceChangeColor(tokenMetadata.priceChange24h)}`}>
                  {getPriceChangeIcon(tokenMetadata.priceChange24h)}
                  {tokenMetadata.priceChange24h > 0 ? '+' : ''}{tokenMetadata.priceChange24h.toFixed(2)}%
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-500 mb-1">Market Cap</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatMarketCap(tokenMetadata.marketCap)}
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-500 mb-1">24h Volume</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatVolume(tokenMetadata.volume24h)}
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-500 mb-1">Supply</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatSupply(tokenMetadata.supply)}
            </div>
          </div>
        </div>

        {/* Description */}
        {tokenMetadata.description && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
              {tokenMetadata.description}
            </p>
          </div>
        )}

        {/* Links */}
        {(tokenMetadata.website || tokenMetadata.twitter) && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex flex-wrap gap-3">
              {tokenMetadata.website && (
                <a
                  href={tokenMetadata.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
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
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Twitter
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 