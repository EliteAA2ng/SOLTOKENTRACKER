// Main service class import and export
import { SolanaService as SolanaServiceClass } from './SolanaService';

// Primary export
export const SolanaService = SolanaServiceClass;

// Named export for compatibility
export { SolanaServiceClass };

// Default export for maximum compatibility
export default SolanaService;

// Re-export types for convenience
export type { TokenTransfer, TokenAccount, TokenMetadata } from '../types'; 