# Solana Token Transfer Tracker

A modern React web application that tracks transfers for any Solana SPL token with comprehensive token information and market data. Built with TypeScript, React, and Solana Web3.js with optimized performance for real-time analysis.

## Features

- 🔍 **Token-Agnostic**: Track transfers for any Solana SPL token by mint address
- 📊 **Comprehensive Token Info**: Displays token name, symbol, current price, market cap, volume, and social links
- 💰 **Multi-Source Data**: Fetches token data from CoinGecko, DexScreener, and Jupiter
- 💸 **Transfer Detection**: Finds both outgoing and incoming transfers with detailed analytics
- ⚡ **Fast Performance**: Optimized with shorter lookback periods (seconds to minutes)
- 🎨 **Modern UI**: Clean, responsive design with real-time loading states and animations
- 🔗 **Enhanced RPC**: Helius integration for faster, more reliable data fetching
- 🌐 **Social Integration**: Direct links to project websites, Twitter, Telegram, and Discord
- 📈 **Live Market Data**: Real-time price, 24h change, market cap, and trading volume
- 🔄 **Streaming Results**: Real-time transfer discovery with batch updates

## Quick Start

### Prerequisites

- Node.js 18+ 
- A Helius API key (recommended) - get one at [helius.xyz](https://helius.xyz)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd solana-token-tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Usage

1. **Enter Token Mint Address**: Paste any Solana SPL token mint address
2. **Optional Wallet Filter**: Enter a specific wallet address to filter transfers
3. **Add Helius API Key**: Your key for enhanced performance and reliability
4. **Select Time Period**: Choose lookback window (5 seconds to 24 hours)
5. **Analyze**: Click "Analyze Transfers" to fetch and display results

The app will automatically:
- Fetch comprehensive token information (name, price, market data)
- Display token logo, social links, and project details
- Show real-time transfer data with streaming updates
- Provide direct links to blockchain explorers

## Configuration

### Default Settings

- **Lookback Period**: 10 minutes (optimized for performance)
- **Max Signatures**: 1000 per query
- **Max Transactions**: 100 processed per analysis
- **Request Delay**: 100ms between API calls

### Helius API Key

For best performance and reliability:

1. Visit [helius.xyz](https://helius.xyz)
2. Sign up and create a free API key
3. Enter it in the app interface

### Environment Variables (Optional)

```bash
# Optional: Set as environment variable
echo "VITE_HELIUS_API_KEY=your-key-here" > .env.local
```

## Data Sources

The app fetches comprehensive token information from multiple reliable sources:

### Token Metadata & Pricing
- **CoinGecko API**: Market data, prices, descriptions, social links, and rankings
- **DexScreener**: Real-time price data, market cap, and trading volumes
- **Jupiter Token List**: Token names, symbols, and logos

### Blockchain Data
- **Helius RPC**: Enhanced Solana RPC with indexed transaction search
- **Standard Solana RPC**: Fallback for basic blockchain queries
- **Block Scanning**: Direct blockchain analysis for comprehensive transfer detection

All data is fetched in parallel for optimal performance, with graceful fallbacks if any source is unavailable.

## How It Works

The tracker uses advanced detection logic to find all token transfers:

1. **Token Metadata Fetching**: Gets token name, symbol, and decimals from Jupiter API
2. **Multi-Source Analysis**: 
   - For wallet-specific queries: Analyzes both signed transactions and token account activity
   - For token-wide queries: Uses Helius Enhanced APIs or samples largest token accounts
3. **Balance Delta Calculation**: Compares pre/post token balances to determine transfer amounts
4. **Smart Counterparty Resolution**: Identifies the other party in each transfer
5. **Deduplication & Sorting**: Removes duplicates and sorts by timestamp

## Performance Optimizations

- **Shorter Time Windows**: Default 10-minute lookback for faster results
- **Intelligent Sampling**: For token-wide queries, samples most active accounts
- **Enhanced APIs**: Leverages Helius Enhanced APIs when available
- **Efficient Caching**: React Query caching with 2-minute stale time
- **Parallel Processing**: Concurrent API calls where possible

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Solana**: @solana/web3.js + @solana/spl-token
- **Data Fetching**: TanStack Query (React Query)
- **Icons**: Lucide React

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
```

## Common Token Examples

The app includes quick-select buttons for popular tokens:

- **USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **BONK**: `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`
- **USDT**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- **SOL**: `So11111111111111111111111111111111111111112`

## Troubleshooting

### No Results Found
- Verify the token mint address is correct
- Try a longer lookback period (30-60 minutes)
- Ensure the token has recent transfer activity
- Check that your Helius API key is valid

### Rate Limiting
- The app includes automatic delays between requests
- Helius accounts have higher rate limits than public RPC
- Try reducing the lookback period if you hit limits

### Performance Issues
- Use shorter lookback periods (5-10 minutes) for faster results
- For token-wide analysis, consider filtering by a specific wallet
- Ensure you're using a valid Helius API key

## API Limits

- **Helius Free Tier**: 100,000 requests/month
- **Built-in Rate Limiting**: 100ms delays between requests
- **Transaction Limits**: Max 100 transactions processed per analysis

## Deployment

### Netlify/Vercel

1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Set environment variables in your deployment platform

### Environment Variables for Production

- `VITE_HELIUS_API_KEY` - Your Helius API key (optional)

## License

MIT License - feel free to use this project for your own token tracking needs.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
