'use client';

import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { User, Mail, Shield, Calendar, Award } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8 max-w-xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase text-white tracking-widest flex items-center gap-2">
          <User className="w-5 h-5 text-cyber-primary" /> Profile Panel
        </h1>
        <p className="text-xs text-gray-400 font-semibold uppercase mt-1">Competitor account keys</p>
      </div>

      {/* Account Info Cards */}
      <div className="glass p-8 rounded-2xl border border-cyber-border/10 flex flex-col gap-6 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-20%] w-36 h-36 rounded-full bg-cyber-primary/5 blur-[50px] pointer-events-none" />
        
        {/* Username */}
        <div className="flex items-center justify-between border-b border-gray-800/50 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-cyber-primary/10 border border-cyber-primary/20 rounded-xl text-cyber-primary">
              <User className="w-5 h-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Username</span>
              <span className="text-sm font-black text-white uppercase mt-0.5">{user.username}</span>
            </div>
          </div>
          <span className="text-xs bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full font-bold uppercase text-gray-300">
            Active Status
          </span>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between border-b border-gray-800/50 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-cyber-secondary/10 border border-cyber-secondary/20 rounded-xl text-cyber-secondary">
              <Mail className="w-5 h-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email Key</span>
              <span className="text-sm font-bold text-gray-300 mt-0.5">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="flex items-center justify-between border-b border-gray-800/50 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-cyber-accent/10 border border-cyber-accent/20 rounded-xl text-cyber-accent">
              <Shield className="w-5 h-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Security Clearance</span>
              <span className="text-sm font-black text-cyber-accent uppercase mt-0.5">{user.role}</span>
            </div>
          </div>
        </div>

        {/* Fake Joined Date (Optional detail) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400">
              <Calendar className="w-5 h-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Initialization Log</span>
              <span className="text-sm font-semibold text-gray-400 mt-0.5">June 21, 2026</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
