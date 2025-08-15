# Solana Token Transfer Tracker

A modern React web application that tracks transfers for any Solana SPL token with comprehensive token information and market data. Built with TypeScript, React, and Solana Web3.js with optimized performance for real-time analysis.

## Features

- 🔍 **Token-Agnostic**: Track transfers for any Solana SPL token by mint address
- 📊 **Comprehensive Token Info**: Displays token name, symbol, current price, market cap, volume, and social links
- 💰 **Multi-Source Data**: Fetches token data from CoinGecko, DexScreener, and Jupiter
- 💰 **Optional Premium Data**: Birdeye API integration available with paid subscription (contact sales for pricing)
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

### Blockchain Data

- **Helius RPC**: Enhanced Solana RPC with better rate limits and additional endpoints
- **Standard Solana RPC**: Fallback for transaction and account data
- **Block Explorer APIs**: Additional transaction parsing capabilities

### Token Data Sources

- **Jupiter Token List**: Comprehensive token registry with names, symbols, and logos
- **CoinGecko API**: Market data, price information, and social media links  
- **DexScreener API**: Real-time price data, market cap, and trading volumes
- **Birdeye API** (Optional Premium): Enhanced market data, liquidity metrics, and token analytics (paid subscription required)

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

### API Issues

#### Birdeye API Failed
If you see "Birdeye API failed" in the API Status Check, this is usually due to one of these reasons:

**Common Causes:**
1. **API Key Required**: Birdeye API requires a **paid** API key - there is no free tier
2. **Demo Key Limitations**: The "demo" key has severe restrictions and often fails
3. **Invalid API Key**: Your API key may be expired or invalid
4. **CORS Issues**: Browser security may block direct API calls

**Solutions:**
1. **Get a Paid Birdeye API Key**: 
   - Visit [Birdeye API](https://docs.birdeye.so/) to purchase an API subscription
   - Set it as environment variable: `VITE_BIRDEYE_API_KEY=your-paid-key-here`

2. **Skip Birdeye (Recommended)**: 
   - The app works perfectly with just Jupiter, CoinGecko, and DexScreener
   - Birdeye is an optional enhancement, not required for core functionality

3. **Alternative Data Sources**: 
   - **Jupiter**: Token names, symbols, logos (✅ Free)
   - **CoinGecko**: Market data, prices, social links (✅ Free with limits)
   - **DexScreener**: Real-time prices, trading volumes (✅ Free)

**Important**: Unlike other APIs, Birdeye has **NO free endpoints**. All endpoints require a paid subscription.

### Other Common Issues

If you encounter issues with token tracking:

1. **No Transfers Found**: 
   - Try increasing the lookback period
   - Check if the token address is correct
   - Some tokens may have very low trading activity

2. **Slow Performance**: 
   - Reduce the lookback period to 1-10 minutes for faster results
   - Get a Helius API key for better performance

3. **Network Errors**: 
   - Check your internet connection
   - Try refreshing the page
   - Some corporate networks may block blockchain APIs

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
