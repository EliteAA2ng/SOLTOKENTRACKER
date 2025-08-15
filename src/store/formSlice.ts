import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_CONFIG } from '../config';

interface FormState {
  tokenMint: string;
  walletAddress: string;
  heliusKey: string;
  seconds: number;
  isWalletConnected: boolean; // Track if wallet is connected vs manually entered
}

const initialState: FormState = {
  tokenMint: '',
  walletAddress: '',
  heliusKey: DEFAULT_CONFIG.defaultHeliusKey,
  seconds: 600, // Default to 10 minutes
  isWalletConnected: false,
};

const formSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    setTokenMint: (state, action: PayloadAction<string>) => {
      state.tokenMint = action.payload;
    },
    setWalletAddress: (state, action: PayloadAction<string>) => {
      state.walletAddress = action.payload;
      // If clearing the address, also clear the connected state
      if (!action.payload) {
        state.isWalletConnected = false;
      }
    },
    setHeliusKey: (state, action: PayloadAction<string>) => {
      state.heliusKey = action.payload;
    },
    setSeconds: (state, action: PayloadAction<number>) => {
      state.seconds = action.payload;
    },
    setIsWalletConnected: (state, action: PayloadAction<boolean>) => {
      state.isWalletConnected = action.payload;
    },
    setFormData: (state, action: PayloadAction<Partial<FormState>>) => {
      return { ...state, ...action.payload };
    },
    resetForm: () => initialState,
  },
});

export const {
  setTokenMint,
  setWalletAddress,
  setHeliusKey,
  setSeconds,
  setIsWalletConnected,
  setFormData,
  resetForm,
} = formSlice.actions;

export default formSlice.reducer; 