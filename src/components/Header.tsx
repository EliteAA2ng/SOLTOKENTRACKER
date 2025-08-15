import { WalletConnection } from './WalletConnection';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setWalletAddress, setIsWalletConnected } from '../store/formSlice';
import { Search } from 'lucide-react';

export function Header() {
  const dispatch = useAppDispatch();
  const walletAddress = useAppSelector((state) => state.form.walletAddress);
  const isWalletConnected = useAppSelector((state) => state.form.isWalletConnected);

  const handleWalletSelect = (address: string) => {
    dispatch(setWalletAddress(address));
    if (address) {
      dispatch(setIsWalletConnected(true));
    } else {
      dispatch(setIsWalletConnected(false));
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-slate-900 rounded-xl">
              <div className="w-6 h-6 bg-gradient-to-br from-violet-400 to-purple-500 rounded-md flex items-center justify-center">
                <Search className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Solana Token Tracker
              </h1>
              <p className="text-xs text-slate-600">
                Track your token transfers on Solana blockchain
              </p>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center">
            <WalletConnection 
              onWalletSelect={handleWalletSelect}
              currentAddress={walletAddress}
              isManualInput={!isWalletConnected}
            />
          </div>
        </div>
      </div>
    </header>
  );
} 