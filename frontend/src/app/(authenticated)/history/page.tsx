'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { History, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface MatchHistoryItem {
  _id: string;
  entryFee: number;
  prizePool: number;
  totalPool: number;
  crashMultiplier?: number;
  status: string;
  players: { userId: string; username: string; stake: number; cashedOut: boolean; cashoutMultiplier?: number; payout?: number }[];
  createdAt: string;
}

export default function HistoryPage() {
  const { user, api } = useAuth();
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/matches/history')
      .then(r => setHistory(r.data.history))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) return (
    <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin"/></div>
  );

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black uppercase text-white tracking-widest flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400"/> Battle Logs
        </h1>
        <p className="text-xs text-gray-400 font-semibold uppercase mt-1">Your crash game history</p>
      </div>

      {history.length === 0 ? (
        <div className="glass p-16 rounded-2xl border border-white/5 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">
          No rounds played yet. Enter an arena from the dashboard!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {history.map(match => {
            const me  = match.players.find(p => p.userId === user?.id);
            const won = me?.cashedOut && (me.payout ?? 0) > 0;
            return (
              <div key={match._id}
                className={`glass p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4
                  ${won ? 'border-green-500/20' : 'border-red-500/10'} hover:border-white/20 transition-all`}>

                {/* Meta */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    {won
                      ? <TrendingUp className="w-4 h-4 text-green-400"/>
                      : <TrendingDown className="w-4 h-4 text-red-400"/>}
                    <span className="text-sm font-black text-white">{match.entryFee} Coin Arena</span>
                    <span className="text-xs text-gray-500 font-bold">
                      crashed @ {match.crashMultiplier?.toFixed(2) ?? '?'}x
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-600 font-semibold">
                    {new Date(match.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Player cashout grid */}
                <div className="flex flex-wrap gap-2">
                  {match.players.map(p => {
                    const isSelf = p.userId === user?.id;
                    return (
                      <div key={p.userId}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                          isSelf
                            ? p.cashedOut ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-white/3 border-white/10 text-gray-400'}`}>
                        {p.username}{isSelf ? ' ★' : ''}
                        {p.cashedOut
                          ? ` @ ${p.cashoutMultiplier?.toFixed(2)}x (+${p.payout})`
                          : ' 💥'}
                      </div>
                    );
                  })}
                </div>

                {/* My result */}
                <div className="text-right flex-shrink-0">
                  <span className={`text-lg font-black ${won ? 'text-green-400' : 'text-red-400'}`}>
                    {won ? `+${me?.payout}` : `-${me?.stake ?? match.entryFee}`}
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold block">coins</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
