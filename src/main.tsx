import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Buffer } from 'buffer'

// Polyfill Buffer for browser usage (required by @solana/spl-token)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (typeof window !== 'undefined' && (window as any).Buffer === undefined) {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	(window as any).Buffer = Buffer
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
) 