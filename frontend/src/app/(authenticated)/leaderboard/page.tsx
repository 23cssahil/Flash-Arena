'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Award, Target, Loader2, Sparkles } from 'lucide-react';

interface LeaderboardEntry {
  _id: string;
  userId: string;
  username: string;
  gamesPlayed: number;
  wins: number;
  totalEarned: number;
}

export default function LeaderboardPage() {
  const { user, api } = useAuth();

  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get('/matches/leaderboard');
        setLeaders(res.data.leaders);
      } catch (err) {
        console.error('Leaderboard: failed to load details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [api]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 text-cyber-primary animate-spin" />
      </div>
    );
  }

  const topThree = leaders.slice(0, 3);
  const remainingLeaders = leaders.slice(3);

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase text-white tracking-widest flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" /> Hall of Valor
        </h1>
        <p className="text-xs text-gray-400 font-semibold uppercase mt-1">Global speed rankings</p>
      </div>

      {leaders.length === 0 ? (
        <div className="glass p-12 rounded-2xl border border-cyber-border/10 text-center text-xs text-gray-400 font-bold uppercase tracking-wider">
          Leaderboards are currently empty. Join a lobby and write history!
        </div>
      ) : (
        <>
          {/* Top 3 podium display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mt-4">
            
            {/* Rank 2 (Silver) */}
            {topThree[1] && (
              <div className="glass p-6 rounded-2xl border border-slate-400/20 text-center flex flex-col gap-3 relative order-2 md:order-1 md:h-[220px] justify-center">
                <div className="absolute top-3 left-3 text-xs bg-slate-400/20 px-2 py-0.5 rounded-md font-bold text-slate-300">
                  RANK #2
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-400/10 border border-slate-400/30 flex items-center justify-center text-slate-300 mx-auto">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="font-black text-white text-base truncate uppercase">{topThree[1].username}</h3>
                <div className="flex flex-col gap-1 text-[11px] font-bold text-gray-400">
                  <span>Wins: {topThree[1].wins} / {topThree[1].gamesPlayed} matches</span>
                  <span className="text-slate-300 font-black">+{topThree[1].totalEarned.toLocaleString()} coins</span>
                </div>
              </div>
            )}

            {/* Rank 1 (Gold) */}
            {topThree[0] && (
              <div className="glass p-8 rounded-2xl border border-yellow-500/30 text-center flex flex-col gap-4 relative order-1 md:order-2 md:h-[260px] justify-center shadow-[0_0_20px_rgba(234,179,8,0.08)]">
                <div className="absolute top-3 right-3 text-xs bg-yellow-500/20 px-2 py-0.5 rounded-md font-bold text-yellow-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} /> RANK #1
                </div>
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 mx-auto shadow-neon-purple">
                  <Trophy className="w-8 h-8" />
                </div>
                <h3 className="font-black text-white text-lg truncate uppercase">{topThree[0].username}</h3>
                <div className="flex flex-col gap-1 text-[11px] font-bold text-gray-400">
                  <span>Wins: {topThree[0].wins} / {topThree[0].gamesPlayed} matches</span>
                  <span className="text-yellow-400 font-black text-sm">+{topThree[0].totalEarned.toLocaleString()} coins</span>
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {topThree[2] && (
              <div className="glass p-6 rounded-2xl border border-amber-600/20 text-center flex flex-col gap-3 relative order-3 md:h-[200px] justify-center">
                <div className="absolute top-3 left-3 text-xs bg-amber-600/20 px-2 py-0.5 rounded-md font-bold text-amber-500">
                  RANK #3
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-600/10 border border-amber-600/30 flex items-center justify-center text-amber-500 mx-auto">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="font-black text-white text-base truncate uppercase">{topThree[2].username}</h3>
                <div className="flex flex-col gap-1 text-[11px] font-bold text-gray-400">
                  <span>Wins: {topThree[2].wins} / {topThree[2].gamesPlayed} matches</span>
                  <span className="text-amber-500 font-black">+{topThree[2].totalEarned.toLocaleString()} coins</span>
                </div>
              </div>
            )}

          </div>

          {/* Remaining players table */}
          {remainingLeaders.length > 0 && (
            <div className="glass rounded-2xl border border-cyber-border/10 overflow-hidden mt-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 bg-white/5 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="p-4 w-20">Rank</th>
                    <th className="p-4">Username</th>
                    <th className="p-4">Matches played</th>
                    <th className="p-4">Wins</th>
                    <th className="p-4 text-right">Total Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {remainingLeaders.map((leader, index) => {
                    const isCurrentUser = leader.userId === user?.id;
                    const relativeRank = index + 4;
                    
                    return (
                      <tr
                        key={leader._id}
                        className={`hover:bg-white/5 transition-all text-gray-200 ${
                          isCurrentUser ? 'bg-cyber-primary/5 text-cyber-primary font-bold' : ''
                        }`}
                      >
                        <td className="p-4 font-black text-gray-400">#{relativeRank}</td>
                        <td className="p-4 font-bold uppercase">{leader.username} {isCurrentUser && '(You)'}</td>
                        <td className="p-4 font-semibold text-gray-400">{leader.gamesPlayed}</td>
                        <td className="p-4 font-semibold text-gray-400">{leader.wins}</td>
                        <td className="p-4 text-right font-black text-yellow-500">
                          {leader.totalEarned.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
