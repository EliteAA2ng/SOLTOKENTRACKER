import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAppDispatch } from '../store/hooks';
import { setWalletAddress, setIsWalletConnected } from '../store/formSlice';
import { Search } from 'lucide-react';
import { useEffect } from 'react';

export function Header() {
  const dispatch = useAppDispatch();
  const { publicKey, connected } = useWallet();

  // Update Redux state when wallet connection changes
  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toString();
      dispatch(setWalletAddress(address));
      dispatch(setIsWalletConnected(true));
    } else {
      dispatch(setWalletAddress(''));
      dispatch(setIsWalletConnected(false));
    }
  }, [connected, publicKey, dispatch]);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-slate-900 rounded-lg">
              <div className="w-6 h-6 bg-gradient-to-br from-violet-400 to-purple-500 rounded-md flex items-center justify-center">
                <Search className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Token Tracker
              </h1>
              <p className="text-xs text-slate-500">
                Solana blockchain analytics
              </p>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </header>
  );
} 