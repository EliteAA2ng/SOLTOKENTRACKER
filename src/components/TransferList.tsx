import { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft, ExternalLink, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { TokenTransfer, TokenMetadata } from '../types';

interface TransferListProps {
  transfers: TokenTransfer[];
  tokenMetadata: TokenMetadata;
  walletAddress?: string;
}

const ITEMS_PER_PAGE = 10;

export default function TransferList({ transfers, tokenMetadata, walletAddress }: TransferListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // tokenMetadata is guaranteed to be available when this component renders
  // because App.tsx checks for it before rendering this component

  const formatAmount = (amount: number): string => {
    // Handle very small amounts
    if (amount < 0.000001) {
      return amount.toExponential(2);
    }
    
    // For amounts less than 1, show up to 6 decimal places but remove trailing zeros
    if (amount < 1) {
      return parseFloat(amount.toFixed(6)).toString();
    }
    
    // For larger amounts, use standard formatting with 2-6 decimal places
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: amount < 1000 ? 6 : 2,
    }).format(amount);
  };

  const formatTimestamp = (timestamp: number): { date: string; relative: string; time: string } => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let relative: string;
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      relative = diffMinutes <= 1 ? '1 min ago' : `${diffMinutes} mins ago`;
    } else if (diffHours < 24) {
      relative = diffHours === 1 ? '1 hr ago' : `${diffHours} hrs ago`;
    } else {
      relative = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    }

    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      relative,
    };
  };

  const formatAddress = (address: string): string => {
    if (walletAddress && address === walletAddress) return 'You';
    if (address === 'Unknown') return 'Unknown';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const getSolscanUrl = (signature: string): string => {
    return `https://solscan.io/tx/${signature}`;
  };

  // Pagination calculations
  const totalPages = Math.ceil(transfers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTransfers = transfers.slice(startIndex, endIndex);

  // Summary calculations
  const summary = useMemo(() => {
    if (walletAddress) {
      // Wallet-specific mode: show received/sent from wallet perspective
      const received = transfers.filter(t => t.direction === 'received');
      const sent = transfers.filter(t => t.direction === 'sent');
      
      return {
        totalTransfers: transfers.length,
        totalReceived: received.reduce((sum, t) => sum + t.amount, 0),
        totalSent: sent.reduce((sum, t) => sum + t.amount, 0),
        receivedCount: received.length,
        sentCount: sent.length,
      };
    } else {
      // Token-wide mode: show total transfers and volume
      const totalVolume = transfers.reduce((sum, t) => sum + t.amount, 0);
      
      return {
        totalTransfers: transfers.length,
        totalReceived: totalVolume, // Total volume transferred
        totalSent: 0, // Not applicable in token-wide mode
        receivedCount: transfers.length,
        sentCount: 0, // Not applicable in token-wide mode
      };
    }
  }, [transfers, walletAddress]);

  if (transfers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <MoreHorizontal className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No transfers found
          </h3>
          <p className="text-slate-600 text-sm max-w-sm">
            No {tokenMetadata.symbol} transfers detected in the specified time period. Try extending the lookback window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600">Total</p>
            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{summary.totalTransfers}</p>
          <p className="text-xs text-slate-500 mt-1">transfers</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600">
              {walletAddress ? 'Received' : 'Transfers'}
            </p>
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            {walletAddress 
              ? `${formatAmount(summary.totalReceived)} ${tokenMetadata.symbol}`
              : `${summary.totalTransfers}`
            }
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {walletAddress ? `${summary.receivedCount} transactions` : 'transfer events'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600">
              {walletAddress ? 'Sent' : 'Volume'}
            </p>
            <ArrowUpRight className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            {walletAddress 
              ? `${formatAmount(summary.totalSent)} ${tokenMetadata.symbol}` 
              : `${formatAmount(summary.totalReceived)} ${tokenMetadata.symbol}`
            }
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {walletAddress ? `${summary.sentCount} transactions` : 'total volume'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600">
              {walletAddress ? 'Net Flow' : 'Token Info'}
            </p>
            <div className="w-2 h-2 bg-violet-400 rounded-full"></div>
          </div>
          <p className="text-2xl font-semibold text-slate-900">
            {walletAddress 
              ? `${formatAmount(Math.abs(summary.totalReceived - summary.totalSent))} ${tokenMetadata.symbol}`
              : tokenMetadata.name
            }
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {walletAddress 
              ? (summary.totalReceived > summary.totalSent ? 'net positive' : 'net negative')
              : `${tokenMetadata.decimals} decimals`
            }
          </p>
        </div>
      </div>

      {/* Transfer Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Transfers
            </h2>
            <div className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  {walletAddress ? 'Type' : 'Transfer'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Transaction
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentTransfers.map((transfer) => {
                const timeInfo = formatTimestamp(transfer.timestamp);
                const isReceived = walletAddress ? transfer.direction === 'received' : false;
                
                return (
                  <tr key={`${transfer.signature}-${transfer.fromAddress}-${transfer.toAddress}-${transfer.amount}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {timeInfo.relative}
                        </span>
                        <span className="text-xs text-slate-500">
                          {timeInfo.date} {timeInfo.time}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      {walletAddress ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isReceived ? 'bg-emerald-50' : 'bg-red-50'
                          }`}>
                            {isReceived ? (
                              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <span className={`text-sm font-medium ${
                            isReceived ? 'text-emerald-700' : 'text-red-700'
                          }`}>
                            {isReceived ? 'Received' : 'Sent'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <ArrowUpRight className="w-4 h-4 text-slate-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            Transfer
                          </span>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-semibold ${
                          walletAddress && isReceived ? 'text-emerald-700' : 
                          walletAddress ? 'text-red-700' : 'text-slate-900'
                        }`}>
                          {walletAddress ? (isReceived ? '+' : '-') : ''}{formatAmount(transfer.amount)}
                        </span>
                        <span className="text-xs text-slate-500">{tokenMetadata.symbol}</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {formatAddress(transfer.fromAddress)}
                        </span>
                        {transfer.fromAddress !== 'Unknown' && (!walletAddress || transfer.fromAddress !== walletAddress) && (
                          <span className="text-xs text-slate-500 font-mono">
                            {transfer.fromAddress}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {formatAddress(transfer.toAddress)}
                        </span>
                        {transfer.toAddress !== 'Unknown' && (!walletAddress || transfer.toAddress !== walletAddress) && (
                          <span className="text-xs text-slate-500 font-mono">
                            {transfer.toAddress}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <a
                        href={getSolscanUrl(transfer.signature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 transition-colors"
                      >
                        <span className="font-mono">
                          {transfer.signature.slice(0, 12)}...
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1} to {Math.min(endIndex, transfers.length)} of {transfers.length} transfers
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-slate-900 text-white'
                            : 'hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 