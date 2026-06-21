'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { TrendingUp, Trophy, Zap, Award, Coins, Users, Play, History } from 'lucide-react';

interface HistoryItem {
  _id: string;
  entryFee: number;
  prizePool: number;
  status: string;
  crashMultiplier?: number;
  players: { userId: string; username: string; stake: number; cashedOut: boolean; cashoutMultiplier?: number; payout?: number }[];
  createdAt: string;
}

const TIERS = [
  { name: 'Bronze',  fee: 10,  players: 3, color: 'border-amber-500/30 from-amber-900/20 to-transparent',   btn: 'bg-amber-500 hover:bg-amber-400',   badge: 'text-amber-400' },
  { name: 'Silver',  fee: 50,  players: 3, color: 'border-slate-400/30 from-slate-700/20 to-transparent',   btn: 'bg-slate-300 hover:bg-white text-black', badge: 'text-slate-300' },
  { name: 'Gold',    fee: 100, players: 3, color: 'border-yellow-400/30 from-yellow-900/20 to-transparent', btn: 'bg-yellow-400 hover:bg-yellow-300',  badge: 'text-yellow-400' },
  { name: 'Diamond', fee: 500, players: 3, color: 'border-cyan-400/30 from-cyan-900/20 to-transparent',    btn: 'bg-gradient-to-r from-cyan-400 to-violet-500', badge: 'text-cyan-400' },
];

export default function Dashboard() {
  const { user, api } = useAuth();
  const router = useRouter();

  const [stats,    setStats]    = useState({ played:0, wins:0, earned:0 });
  const [history,  setHistory]  = useState<HistoryItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [balance,  setBalance]  = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [histRes, balRes] = await Promise.all([
          api.get('/matches/history'),
          api.get('/wallet/balance'),
        ]);
        const list: HistoryItem[] = histRes.data.history;
        setHistory(list);
        setBalance(balRes.data.balance);

        const played = list.filter(m => m.status === 'crashed').length;
        const wins   = list.filter(m => {
          const me = m.players.find(p => p.userId === user?.id);
          return me?.cashedOut && (me.payout ?? 0) > 0;
        }).length;
        const earned = list.reduce((s,m) => {
          const me = m.players.find(p=>p.userId===user?.id);
          return s + (me?.payout ?? 0);
        }, 0);
        setStats({ played, wins, earned });
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [user, api]);

  return (
    <div className="flex flex-col gap-8">

      {/* Welcome banner */}
      <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
        className="glass rounded-2xl border border-white/5 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-white">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">{user?.username}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1 font-medium">Choose an arena. Ride the multiplier. Cash out before the crash.</p>
        </div>
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-xl">
          <Coins className="w-4 h-4 text-yellow-400"/>
          <span className="text-base font-black text-yellow-400">{balance.toLocaleString()} coins</span>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Rounds Played', val: loading?'…':stats.played, icon:Zap,      color:'text-cyan-400',   bg:'bg-cyan-500/10 border-cyan-500/20' },
          { label:'Times Cashed',  val: loading?'…':stats.wins,   icon:Trophy,   color:'text-yellow-400', bg:'bg-yellow-500/10 border-yellow-500/20' },
          { label:'Win Rate',      val: loading?'…':`${stats.played?Math.round((stats.wins/stats.played)*100):0}%`, icon:TrendingUp, color:'text-violet-400', bg:'bg-violet-500/10 border-violet-500/20' },
          { label:'Total Earned',  val: loading?'…':stats.earned.toLocaleString(), icon:Award, color:'text-green-400', bg:'bg-green-500/10 border-green-500/20' },
        ].map(({ label, val, icon:Icon, color, bg }) => (
          <div key={label} className={`glass p-5 rounded-xl border ${bg} flex items-center justify-between`}>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">{label}</span>
              <span className={`text-2xl font-black ${color} block mt-1`}>{val}</span>
            </div>
            <div className={`w-10 h-10 rounded-lg ${bg} border flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5"/>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Arena tiers */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            <Play className="w-4 h-4 fill-cyan-400 text-cyan-400"/> Crash Arenas
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TIERS.map((t, i) => (
              <motion.div key={t.name}
                initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{delay:i*0.08}}
                className={`glass p-6 rounded-2xl border bg-gradient-to-br ${t.color} flex flex-col justify-between gap-5`}>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-base font-black uppercase tracking-wider ${t.badge}`}>{t.name} Arena</h3>
                    <span className="text-[10px] text-gray-400 font-bold uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                      {t.players} players
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed">
                    Stake <span className={`font-black ${t.badge}`}>{t.fee} coins</span>, ride the multiplier and cash out before the crash!
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Max prize pool</span>
                    <span className={`text-lg font-black ${t.badge}`}>{(t.fee * t.players * 0.9).toFixed(0)} coins</span>
                  </div>
                  <button onClick={() => router.push(`/matchmaking?entryFee=${t.fee}`)}
                    className={`${t.btn} text-black font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95`}>
                    Enter
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent history */}
        <div className="flex flex-col gap-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            <History className="w-4 h-4 text-violet-400"/> Recent Rounds
          </h2>

          <div className="glass rounded-2xl border border-white/5 p-4 flex flex-col gap-3 flex-1">
            {loading ? (
              <div className="text-center py-8 text-sm text-gray-400 font-bold">Loading…</div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-2">
                <Zap className="w-8 h-8 text-gray-700"/>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">No rounds yet</span>
              </div>
            ) : (
              history.slice(0,6).map(m => {
                const me = m.players.find(p=>p.userId===user?.id);
                const won = me?.cashedOut && (me.payout??0)>0;
                return (
                  <div key={m._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <span className="text-xs font-bold text-gray-200">{m.entryFee} Coin Arena</span>
                      <span className="text-[10px] text-gray-500 block">
                        crash @ {m.crashMultiplier?.toFixed(2) ?? '?'}x
                      </span>
                    </div>
                    <span className={`text-xs font-black ${won?'text-green-400':'text-red-400'}`}>
                      {won ? `+${me?.payout}` : `-${me?.stake ?? m.entryFee}`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
