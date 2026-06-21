'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Shield, Users, Coins, Percent, TrendingUp, FileText, Loader2, Check } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  coinsInCirculation: number;
  totalMatches: number;
  activeMatchesCount: number;
  totalCommissionEarned: number;
  totalVolumeTraded: number;
  activeMatches: any[];
}

interface AdminUser {
  _id: string; username: string; email: string; role: string; isActive: boolean;
}

interface AuditLog {
  _id: string;
  adminId: { username: string };
  action: string;
  details: Record<string, any>;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, api } = useAuth();
  const router        = useRouter();

  const [stats,      setStats]      = useState<AdminStats | null>(null);
  const [users,      setUsers]      = useState<AdminUser[]>([]);
  const [logs,       setLogs]       = useState<AuditLog[]>([]);
  const [commission, setCommission] = useState(10);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saveOk,     setSaveOk]     = useState(false);
  const [banningId,  setBanningId]  = useState<string|null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/dashboard');
  }, [user, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const load = async () => {
      try {
        const [s, u, c, l] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users'),
          api.get('/admin/commission'),
          api.get('/admin/logs'),
        ]);
        setStats(s.data);
        setUsers(u.data.users);
        setCommission(c.data.commission);
        setLogs(l.data.logs);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [user, api]);

  const saveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaveOk(false);
    try {
      await api.post('/admin/commission', { commission });
      setSaveOk(true);
      const l = await api.get('/admin/logs');
      setLogs(l.data.logs);
    } catch {}
    finally { setSaving(false); }
  };

  const toggleBan = async (uid: string) => {
    setBanningId(uid);
    try {
      await api.post(`/admin/users/${uid}/ban`);
      setUsers(prev => prev.map(u => u._id===uid ? {...u,isActive:!u.isActive} : u));
    } catch {}
    finally { setBanningId(null); }
  };

  if (!user || user.role !== 'admin') return null;
  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 className="w-8 h-8 text-red-400 animate-spin"/>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">

      <div>
        <h1 className="text-2xl font-black uppercase text-red-400 tracking-widest flex items-center gap-2">
          <Shield className="w-5 h-5"/> Admin Command Centre
        </h1>
        <p className="text-xs text-gray-400 font-semibold uppercase mt-1">Platform management & analytics</p>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Total Users',     val:stats.totalUsers.toLocaleString(),             icon:Users,      color:'text-cyan-400',   bg:'border-cyan-500/20' },
            { label:'Coins Circulating', val:stats.coinsInCirculation.toLocaleString(),   icon:Coins,      color:'text-yellow-400', bg:'border-yellow-500/20' },
            { label:'Coin Volume',      val:stats.totalVolumeTraded.toLocaleString(),      icon:TrendingUp, color:'text-violet-400', bg:'border-violet-500/20' },
            { label:'Platform Revenue', val:stats.totalCommissionEarned.toLocaleString(), icon:Percent,    color:'text-red-400',    bg:'border-red-500/20' },
          ].map(({ label, val, icon:Icon, color, bg }) => (
            <div key={label} className={`glass p-5 rounded-xl border ${bg}`}>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">{label}</span>
              <span className={`text-xl font-black ${color} block mt-1`}>{val}</span>
              <Icon className={`w-4 h-4 ${color} mt-2`}/>
            </div>
          ))}
        </div>
      )}

      {/* Active crashes */}
      {stats && stats.activeMatches.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-white">⚡ Live Rounds ({stats.activeMatchesCount})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.activeMatches.map(m => (
              <div key={m._id} className="glass p-4 rounded-xl border border-cyan-500/20 text-xs">
                <div className="flex justify-between font-bold">
                  <span className="text-cyan-400">{m.entryFee} Coin Arena</span>
                  <span className="text-yellow-400 uppercase">{m.status}</span>
                </div>
                <div className="text-gray-400 mt-1">Pool: {m.prizePool} | Players: {m.players?.length}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Users table */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400"/> User Registry
          </h2>
          <div className="glass rounded-xl border border-white/5 overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 bg-white/5 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="p-3">Username</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-white/3 text-gray-300 transition-all">
                      <td className="p-3 font-bold uppercase">{u.username}</td>
                      <td className="p-3 text-gray-400">{u.email}</td>
                      <td className="p-3 uppercase">{u.role}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          u.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {u.isActive ? 'Active' : 'Banned'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {u.role !== 'admin' && (
                          <button onClick={() => toggleBan(u._id)}
                            disabled={banningId === u._id}
                            className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all
                              ${u.isActive
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-black'
                                : 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black'}`}>
                            {banningId===u._id ? '…' : u.isActive ? 'Ban' : 'Unban'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Commission config */}
          <div className="flex flex-col gap-3 mt-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Percent className="w-4 h-4 text-violet-400"/> Commission Rate
            </h2>
            <form onSubmit={saveCommission}
              className="glass p-5 rounded-xl border border-violet-500/20 flex items-center gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Platform Fee (%)
                </label>
                <input type="number" min="0" max="50" step="0.5" value={commission}
                  onChange={e => setCommission(parseFloat(e.target.value))}
                  className="bg-white/5 border border-gray-700 focus:border-violet-400 rounded-lg px-3 py-2 text-sm font-bold text-white outline-none w-40 transition-all"/>
              </div>
              <div className="flex items-center gap-3">
                {saveOk && <Check className="w-5 h-5 text-green-400"/>}
                <button type="submit" disabled={saving}
                  className="bg-gradient-to-r from-violet-500 to-cyan-400 text-black font-black text-xs
                  uppercase tracking-widest px-5 py-3 rounded-xl hover:scale-105 transition-all disabled:opacity-50">
                  {saving ? 'Saving…' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Audit log */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-400"/> Audit Trail
          </h2>
          <div className="glass rounded-xl border border-white/5 p-4 h-[520px] overflow-y-auto flex flex-col gap-3">
            {logs.length === 0 ? (
              <div className="text-center text-xs text-gray-600 font-bold uppercase my-auto">No logs yet</div>
            ) : logs.map(l => (
              <div key={l._id} className="border-b border-gray-800/40 pb-3 text-[11px]">
                <div className="flex justify-between text-gray-400 font-bold">
                  <span className="text-red-400">@{l.adminId?.username ?? 'admin'}</span>
                  <span>{new Date(l.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="text-white font-bold uppercase text-[10px] mt-0.5">{l.action}</div>
                <div className="text-gray-500">{JSON.stringify(l.details)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
