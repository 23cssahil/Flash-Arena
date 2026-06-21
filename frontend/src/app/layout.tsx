import './globals.css';
import { ReactNode } from 'react';
import Providers from './providers';

export const metadata = {
  title: 'Flash Arena - Real-time Reaction Gaming Platform',
  description: 'Join real-time, reaction-speed multiplayer arenas, win virtual coins, and dominate the global leaderboards.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cyber-bg text-gray-100 min-h-screen relative">
        {/* Retro cyber scanlines effect */}
        <div className="scanlines" />
        
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
