'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, Trophy, Users, Award, Play } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
  };

  const features = [
    {
      icon: Zap,
      title: 'Reaction Speed Matches',
      desc: 'Compete in fast-paced rooms clicking randomly spawning targets. Milliseconds decide the winners.',
      color: 'text-cyber-primary border-cyber-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.05)]',
    },
    {
      icon: ShieldCheck,
      title: 'Anti-Cheat Engine',
      desc: 'Server-side speed verification and double-click safeguards ensure a 100% fair environment.',
      color: 'text-cyber-accent border-cyber-accent/20 shadow-[0_0_15px_rgba(255,0,122,0.05)]',
    },
    {
      icon: Trophy,
      title: 'Instant Dividends',
      desc: 'Entry fee pool minus platform commission is distributed automatically to top performers.',
      color: 'text-cyber-secondary border-cyber-secondary/20 shadow-[0_0_15px_rgba(189,0,255,0.05)]',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Concurrent Competitors', sub: 'Low latency gameplay' },
    { value: '< 100ms', label: 'Anti-Cheat Validation', sub: 'Human response check' },
    { value: '1.2M+', label: 'Coins Dispersed', sub: 'Zero deficit payouts' },
    { value: '24/7', label: 'Active Lobbies', sub: 'Matchmaking in seconds' },
  ];

  return (
    <div className="min-h-screen bg-cyber-gradient flex flex-col items-center justify-between px-4 md:px-8 py-12 relative overflow-hidden">
      {/* Visual background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyber-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyber-secondary/10 blur-[120px] pointer-events-none" />

      {/* Header logo/entry */}
      <div className="w-full max-w-7xl flex items-center justify-between z-10">
        <span className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-cyber-secondary animate-neon-text">
          FLASH ARENA
        </span>

        <Link
          href={user ? '/dashboard' : '/login'}
          className="glass px-5 py-2 rounded-lg text-sm font-bold tracking-wider hover:border-cyber-primary/45 transition-all text-cyber-primary"
        >
          {user ? 'DASHBOARD' : 'SIGN IN'}
        </Link>
      </div>

      {/* Main Hero Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-4xl text-center flex flex-col items-center gap-8 my-16 z-10"
      >
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-cyber-primary/10 border border-cyber-primary/30 px-3 py-1 rounded-full">
          <Award className="w-4 h-4 text-cyber-primary animate-pulse" />
          <span className="text-xs font-bold text-cyber-primary tracking-widest uppercase">The Ultimate Speed Arena</span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none text-white uppercase"
        >
          Compete. Click.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary via-cyber-secondary to-cyber-accent drop-shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            Earn Virtual Wealth.
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-base md:text-lg text-gray-400 max-w-xl font-medium"
        >
          Step into a high-octane multiplayer arena. Challenge your reaction speed against real players, climb the ranks, and instantly claim virtual coin dividends.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 mt-4 w-full justify-center">
          <Link
            href={user ? '/dashboard' : '/register'}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-cyber-primary to-cyber-secondary text-black font-black tracking-wider text-base px-8 py-4 rounded-xl shadow-neon-cyan hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Play className="w-5 h-5 fill-black" />
            ENTER ARENA NOW
          </Link>
          {!user && (
            <Link
              href="/login"
              className="w-full sm:w-auto glass hover:border-cyber-primary/40 px-8 py-4 rounded-xl font-bold tracking-wider text-gray-200 transition-all"
            >
              CHALLENGE AS GUEST
            </Link>
          )}
        </motion.div>
      </motion.div>

      {/* Grid of stats */}
      <div className="w-full max-w-7xl grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 my-8 z-10">
        {stats.map((stat, idx) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            key={idx}
            className="glass p-5 rounded-xl border border-cyber-border/10 flex flex-col gap-1 items-center text-center"
          >
            <span className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-cyber-secondary">
              {stat.value}
            </span>
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{stat.label}</span>
            <span className="text-[10px] text-gray-500 font-semibold">{stat.sub}</span>
          </motion.div>
        ))}
      </div>

      {/* Feature Breakdown */}
      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-6 my-12 z-10">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              key={idx}
              className={`glass p-6 rounded-2xl border ${feat.color} flex flex-col gap-4`}
            >
              <div className="w-12 h-12 rounded-xl glass flex items-center justify-center bg-white/5">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide uppercase">{feat.title}</h3>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">{feat.desc}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 font-bold z-10 border-t border-gray-900 pt-6">
        <span>© 2026 FLASH ARENA. ALL RIGHTS RESERVED.</span>
        <div className="flex gap-4 mt-2 md:mt-0">
          <span className="hover:text-cyber-primary cursor-pointer transition-all">TERMS OF SERVICE</span>
          <span className="hover:text-cyber-primary cursor-pointer transition-all">PRIVACY CONTRACT</span>
        </div>
      </div>
    </div>
  );
}
