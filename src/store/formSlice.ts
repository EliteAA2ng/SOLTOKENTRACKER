import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_CONFIG } from '../config';

interface FormState {
  tokenMint: string;
  walletAddress: string;
  heliusKey: string;
  seconds: number;
}

const initialState: FormState = {
  tokenMint: '',
  walletAddress: '',
  heliusKey: DEFAULT_CONFIG.defaultHeliusKey,
  seconds: 600, // Default to 10 minutes
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
    },
    setHeliusKey: (state, action: PayloadAction<string>) => {
      state.heliusKey = action.payload;
    },
    setSeconds: (state, action: PayloadAction<number>) => {
      state.seconds = action.payload;
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
  setFormData,
  resetForm,
} = formSlice.actions;

export default formSlice.reducer; 