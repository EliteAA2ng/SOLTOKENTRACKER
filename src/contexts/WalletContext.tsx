import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  manualAddress: string;
  setManualAddress: (address: string) => void;
  isWalletInputDisabled: boolean;
  showConnectModal: boolean;
  setShowConnectModal: (show: boolean) => void;
  handleConnect: () => void;
  handleDisconnect: () => void;
  getEffectiveAddress: () => string | undefined;
  isAutoConnecting: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { connected, publicKey, disconnect } = useWallet();
  const [manualAddress, setManualAddress] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  
  // Derived state
  const isConnected = connected && !!publicKey;
  const walletAddress = isConnected ? publicKey!.toString() : null;
  const isWalletInputDisabled = isConnected;

  // Monitor auto-connect status
  useEffect(() => {
    const sessionAttempted = sessionStorage.getItem('autoConnectAttempted');
    if (!sessionAttempted && !isConnected) {
      setIsAutoConnecting(true);
      
      // Hide auto-connecting after reasonable time
      const timeout = setTimeout(() => {
        setIsAutoConnecting(false);
      }, 6000);
      
      return () => clearTimeout(timeout);
    }
  }, [isConnected]);

  // Hide auto-connecting when wallet connects or attempt completes
  useEffect(() => {
    const sessionAttempted = sessionStorage.getItem('autoConnectAttempted');
    if (isConnected || sessionAttempted) {
      setIsAutoConnecting(false);
    }
  }, [isConnected]);

  // Clear manual address when wallet connects
  useEffect(() => {
    if (isConnected) {
      setManualAddress('');
    }
  }, [isConnected]);

  const handleConnect = () => {
    setShowConnectModal(true);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      console.log('✅ Wallet disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting wallet:', error);
    }
  };

  // Get the effective address (wallet address takes priority over manual)
  const getEffectiveAddress = (): string | undefined => {
    if (walletAddress) return walletAddress;
    if (manualAddress.trim()) return manualAddress.trim();
    return undefined;
  };

  const value: WalletContextType = {
    isConnected,
    walletAddress,
    manualAddress,
    setManualAddress,
    isWalletInputDisabled,
    showConnectModal,
    setShowConnectModal,
    handleConnect,
    handleDisconnect,
    getEffectiveAddress,
    isAutoConnecting,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}; 