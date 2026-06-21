'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Shield, Coins, LogOut, Menu, X, Trophy, Activity, Wallet, User as UserIcon } from 'lucide-react';

export default function Navbar() {
  const { user, logout, api } = useAuth();
  const { socket } = useSocket();
  const pathname = usePathname();
  const router = useRouter();
  
  const [balance, setBalance] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch balance function
  const fetchBalance = async () => {
    try {
      const res = await api.get('/wallet/balance');
      setBalance(res.data.balance);
    } catch (err) {
      console.error('Navbar: failed to load balance', err);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchBalance();

    // Set up polling for smooth balance refreshes
    const interval = setInterval(fetchBalance, 10000);

    // Listen to real-time events that alter balance
    if (socket) {
      socket.on('game_over', (data) => {
        // Trigger balance update shortly after game over
        setTimeout(fetchBalance, 1500);
      });
      socket.on('wallet_update', () => {
        fetchBalance();
      });
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('game_over');
        socket.off('wallet_update');
      }
    };
  }, [user, socket]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: Activity },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { label: 'Wallet', path: '/wallet', icon: Wallet },
    { label: 'History', path: '/history', icon: UserIcon },
  ];

  return (
    <nav className="glass sticky top-0 z-50 px-4 py-3 md:px-8 flex items-center justify-between">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="text-xl md:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-cyber-secondary animate-neon-text">
          FLASH ARENA
        </span>
      </Link>

      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-6">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.path;
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex items-center gap-1.5 text-sm font-semibold tracking-wide transition-all ${
                isActive 
                  ? 'text-cyber-primary border-b-2 border-cyber-primary pb-0.5' 
                  : 'text-gray-300 hover:text-cyber-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}

        {user.role === 'admin' && (
          <Link
            href="/admin"
            className={`flex items-center gap-1.5 text-sm font-semibold tracking-wide text-cyber-accent hover:opacity-85 ${
              pathname.startsWith('/admin') ? 'border-b-2 border-cyber-accent pb-0.5' : ''
            }`}
          >
            <Shield className="w-4 h-4" />
            Admin Panel
          </Link>
        )}
      </div>

      {/* Profile / Balance */}
      <div className="hidden md:flex items-center gap-4">
        {/* Coins indicator */}
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.1)]">
          <Coins className="w-4 h-4 text-yellow-400 animate-pulse" />
          <span className="text-sm font-bold text-yellow-400">
            {balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* Username */}
        <div className="text-sm font-bold text-gray-200">
          {user.username}
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="p-2 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded-lg transition-all"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Menu Actions */}
      <div className="flex items-center gap-3 md:hidden">
        {/* Coins Indicator Mobile */}
        <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 px-2 py-1 rounded-full">
          <Coins className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs font-bold text-yellow-400">{balance}</span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-gray-300 hover:text-cyber-primary"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div className="absolute top-[57px] left-0 w-full glass flex flex-col p-6 gap-4 md:hidden border-t border-cyber-border/20 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.path;
            return (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 py-2 text-sm font-semibold tracking-wide border-b border-gray-800 ${
                  isActive ? 'text-cyber-primary' : 'text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}

          {user.role === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 py-2 text-sm font-semibold tracking-wide border-b border-gray-800 text-cyber-accent"
            >
              <Shield className="w-5 h-5" />
              Admin Panel
            </Link>
          )}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-3 py-2 text-sm font-semibold tracking-wide text-red-400 mt-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
