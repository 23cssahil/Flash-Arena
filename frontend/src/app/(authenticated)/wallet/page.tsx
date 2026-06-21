'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Coins, PlusCircle, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

interface Transaction {
  _id: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  createdAt: string;
}

export default function WalletPage() {
  const { api } = useAuth();

  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [claiming, setClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<{ success: boolean; message: string } | null>(null);

  const loadWalletData = async () => {
    try {
      const balanceRes = await api.get('/wallet/balance');
      setBalance(balanceRes.data.balance);

      const txRes = await api.get('/wallet/transactions');
      setTransactions(txRes.data.transactions);
    } catch (err) {
      console.error('Wallet: failed to load details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, [api]);

  const handleClaimFaucet = async () => {
    setClaiming(true);
    setClaimStatus(null);
    try {
      const res = await api.post('/wallet/faucet');
      setClaimStatus({ success: true, message: res.data.message });
      // Reload balance & history
      await loadWalletData();
      
      // Dispatch event to Navbar to refresh
      window.dispatchEvent(new Event('wallet_update'));
    } catch (err: any) {
      console.error(err);
      setClaimStatus({
        success: false,
        message: err.response?.data?.message || err.response?.data?.error || 'Faucet claim failed. Try again later.',
      });
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 text-cyber-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase text-white tracking-widest flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-500" /> Virtual Vault
        </h1>
        <p className="text-xs text-gray-400 font-semibold uppercase mt-1">Manage coins and audits</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Display */}
        <div className="glass p-6 rounded-2xl border border-cyber-border/20 flex flex-col justify-between gap-4 h-full relative overflow-hidden shadow-[0_0_20px_rgba(0,240,255,0.05)]">
          <div className="absolute top-[-20%] right-[-10%] w-24 h-24 rounded-full bg-cyber-primary/10 blur-[40px] pointer-events-none" />
          
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Balance</span>
            <span className="text-3xl font-black text-white mt-2 flex items-center gap-1.5">
              <Coins className="w-6 h-6 text-yellow-400 animate-pulse" />
              {balance !== null ? balance.toLocaleString() : '...'}
            </span>
          </div>

          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            Coins are virtual and hold 0 monetary value
          </span>
        </div>

        {/* Faucet Box */}
        <div className="md:col-span-2 glass p-6 rounded-2xl border border-cyber-borderPurple/30 flex flex-col justify-between gap-4 h-full relative overflow-hidden">
          <div>
            <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-1.5">
              <PlusCircle className="w-4.5 h-4.5 text-cyber-secondary" /> Daily Coin Claim
            </h3>
            <p className="text-xs text-gray-400 font-medium leading-relaxed mt-1.5">
              Running low on coins? Claim 500 virtual coins from the faucet. Available once every 24 hours.
            </p>
          </div>

          {claimStatus && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-start gap-2 p-3 rounded-lg text-xs font-semibold ${
                claimStatus.success 
                  ? 'bg-cyber-success/10 border border-cyber-success/20 text-cyber-success' 
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{claimStatus.message}</span>
            </motion.div>
          )}

          <button
            onClick={handleClaimFaucet}
            disabled={claiming}
            className="bg-gradient-to-r from-cyber-secondary to-cyber-accent text-white font-black tracking-wider py-3 rounded-xl shadow-neon-purple hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none text-xs flex items-center justify-center gap-2"
          >
            {claiming ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                CONNECTING VAULT API...
              </>
            ) : (
              'CLAIM FREE 500 COINS'
            )}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-black uppercase text-white tracking-widest flex items-center gap-2">
          <RefreshCw className="w-4.5 h-4.5 text-cyber-primary" style={{ animationDuration: '4s' }} /> Transaction History
        </h2>

        <div className="glass rounded-2xl border border-cyber-border/10 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="text-center py-16 text-xs text-gray-400 font-bold uppercase tracking-wider">
              No transactions logged yet
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 bg-white/5 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="p-4">Type</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {transactions.map((tx) => {
                    const isCredit = tx.amount > 0;
                    
                    return (
                      <tr key={tx._id} className="hover:bg-white/5 transition-all text-gray-200">
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${
                            tx.status === 'failed'
                              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                              : isCredit 
                              ? 'bg-cyber-success/10 text-cyber-success' 
                              : 'bg-cyber-accent/10 text-cyber-accent'
                          }`}>
                            {isCredit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {tx.type}
                          </span>
                        </td>
                        <td className={`p-4 font-black ${
                          tx.status === 'failed' 
                            ? 'text-gray-500 line-through' 
                            : isCredit 
                            ? 'text-cyber-success' 
                            : 'text-cyber-accent'
                        }`}>
                          {isCredit ? '+' : ''}{tx.amount}
                        </td>
                        <td className="p-4 font-medium text-gray-400">{tx.description}</td>
                        <td className="p-4 text-right text-gray-500 font-semibold">
                          {new Date(tx.createdAt).toLocaleDateString()}{' '}
                          {new Date(tx.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
