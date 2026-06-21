'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  TrendingUp, Users, Coins, AlertCircle,
  ArrowLeft, Volume2, VolumeX, Timer, Zap, LogOut
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlayerRecord {
  userId: string;
  username: string;
  stake: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  payout?: number;
}

interface MultiplierPoint { x: number; y: number; }

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CrashGameScreen() {
  const params   = useParams();
  const router   = useRouter();
  const matchId  = params.matchId as string;

  const { user, api }         = useAuth();
  const { socket, connected } = useSocket();

  // ── State ───────────────────────────────────────────────────────────────────
  const [match,       setMatch]       = useState<any>(null);
  const [players,     setPlayers]     = useState<PlayerRecord[]>([]);
  const [gameState,   setGameState]   = useState<'loading'|'countdown'|'playing'|'crashed'|'ended'|'failed'>('loading');
  const [countdown,   setCountdown]   = useState(5);
  const [multiplier,  setMultiplier]  = useState(1.00);
  const [crashAt,     setCrashAt]     = useState<number|null>(null);
  const [myCashedOut, setMyCashedOut] = useState(false);
  const [muted,       setMuted]       = useState(false);
  const [errorMsg,    setErrorMsg]    = useState<string|null>(null);
  const [cashoutMsg,  setCashoutMsg]  = useState<string|null>(null);

  // Animated chart points
  const [chartPoints, setChartPoints] = useState<MultiplierPoint[]>([{ x: 0, y: 0 }]);
  const chartRef = useRef<SVGSVGElement>(null);

  // ── Audio ───────────────────────────────────────────────────────────────────
  const audioCtx = useRef<AudioContext | null>(null);
  const playSound = useCallback((type: 'tick'|'cashout'|'crash'|'win') => {
    if (muted) return;
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (type === 'tick') {
      osc.frequency.setValueAtTime(300 + multiplier * 60, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'cashout') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now); osc.stop(now + 0.35);
    } else if (type === 'crash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.6);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now); osc.stop(now + 0.6);
    } else if (type === 'win') {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.frequency.value = freq;
        g2.gain.setValueAtTime(0.12, now + i * 0.1);
        g2.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
        o2.start(now + i * 0.1); o2.stop(now + i * 0.1 + 0.25);
      });
    }
  }, [muted, multiplier]);

  // ── Chart helpers ───────────────────────────────────────────────────────────
  const W = 600; const H = 280;
  const MAX_M = match?.maxSafeMultiplier ?? 5;

  // Convert multiplier value → SVG coordinates
  const toSVG = (pts: MultiplierPoint[]) => {
    if (pts.length < 2) return '';
    const maxX = Math.max(...pts.map(p => p.x), 1);
    const maxY = Math.max(...pts.map(p => p.y), 1);
    return pts.map((p, i) => {
      const sx = (p.x / maxX) * (W - 40) + 20;
      const sy = H - 20 - ((p.y / maxY) * (H - 40));
      return `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
    }).join(' ');
  };

  // ── Load match ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/matches/${matchId}`);
        setMatch(res.data.match);
        setPlayers(res.data.match.players);
        const me = res.data.match.players.find((p: PlayerRecord) => p.userId === user?.id);
        if (me?.cashedOut) setMyCashedOut(true);
        const st = res.data.match.status;
        if (st === 'crashed') {
          setGameState('crashed');
          setCrashAt(res.data.match.crashMultiplier);
        } else {
          setGameState(st);
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.error || 'Failed to load match.');
        setGameState('failed');
      }
    };
    load();
  }, [matchId, api, user]);

  // ── Socket listeners ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !connected || !match) return;
    socket.emit('join_room', { roomId: match.roomId });

    socket.on('countdown_update', (d: { countdown: number }) => {
      setCountdown(d.countdown);
      setGameState('countdown');
      if (d.countdown > 0) playSound('tick');
    });

    socket.on('game_start', () => {
      setGameState('playing');
      setMultiplier(1.00);
      setChartPoints([{ x: 0, y: 0 }]);
    });

    socket.on('multiplier_update', (d: { multiplier: number }) => {
      setMultiplier(d.multiplier);
      setChartPoints(prev => {
        const next = [...prev, { x: prev.length, y: d.multiplier - 1 }];
        return next.slice(-200); // keep last 200 ticks
      });
    });

    socket.on('player_cashed_out', (d: { userId: string; username: string; multiplier: number; payout: number }) => {
      setPlayers(prev => prev.map(p =>
        p.userId === d.userId
          ? { ...p, cashedOut: true, cashoutMultiplier: d.multiplier, payout: d.payout }
          : p
      ));
      if (d.userId === user?.id) {
        setMyCashedOut(true);
        setCashoutMsg(`💸 Cashed out at ${d.multiplier.toFixed(2)}x → +${d.payout} coins!`);
        playSound('cashout');
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        setTimeout(() => setCashoutMsg(null), 4000);
      }
    });

    socket.on('crash_event', (d: { crashMultiplier: number }) => {
      setCrashAt(d.crashMultiplier);
      setGameState('crashed');
      setChartPoints(prev => [...prev, { x: prev.length, y: d.crashMultiplier - 1 }]);
      playSound('crash');
      // Refresh match data
      api.get(`/matches/${matchId}`).then(r => setPlayers(r.data.match.players)).catch(() => {});
    });

    socket.on('game_ended', (d: { crashMultiplier: number }) => {
      setCrashAt(d.crashMultiplier);
      setGameState('ended');
      api.get(`/matches/${matchId}`).then(r => setPlayers(r.data.match.players)).catch(() => {});
    });

    socket.on('cashout_denied', (d: { message: string }) => {
      setCashoutMsg(`⚠️ ${d.message}`);
      setTimeout(() => setCashoutMsg(null), 3000);
    });

    return () => {
      ['countdown_update','game_start','multiplier_update','player_cashed_out',
       'crash_event','game_ended','cashout_denied'].forEach(e => socket.off(e));
    };
  }, [socket, connected, match, user, playSound]);

  // ── Cashout handler ──────────────────────────────────────────────────────────
  const handleCashout = () => {
    if (!socket || gameState !== 'playing' || myCashedOut) return;
    socket.emit('cash_out', { matchId });
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  const myRecord       = players.find(p => p.userId === user?.id);
  const myCurrentValue = myRecord && !myCashedOut && gameState === 'playing'
    ? Math.floor((myRecord.stake ?? 0) * multiplier)
    : myRecord?.payout ?? 0;

  const crashed = gameState === 'crashed' || gameState === 'ended';
  const didIWin = myCashedOut && (myRecord?.payout ?? 0) > 0;

  // Multiplier colour: green → yellow → red as it climbs
  const multColour = multiplier < 1.5 ? '#00ff66'
    : multiplier < 2.5 ? '#fbbf24'
    : multiplier < 4   ? '#f97316'
    : '#ff3d3d';

  // ── Loading / Error States ───────────────────────────────────────────────────
  if (gameState === 'loading') return (
    <div className="min-h-screen bg-[#05060b] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (gameState === 'failed') return (
    <div className="min-h-screen bg-[#05060b] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertCircle className="w-12 h-12 text-red-400"/>
      <h1 className="text-xl font-bold text-white">Lobby Error</h1>
      <p className="text-sm text-gray-400">{errorMsg}</p>
      <button onClick={() => router.push('/dashboard')}
        className="flex items-center gap-1.5 border border-cyan-500/30 text-cyan-400 px-5 py-2.5 rounded-xl text-sm font-bold">
        <ArrowLeft className="w-4 h-4"/> Back to Dashboard
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05060b] text-white flex flex-col relative overflow-hidden">

      {/* ── Sound Toggle ── */}
      <button onClick={() => setMuted(!muted)}
        className="absolute top-4 right-4 z-40 p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-gray-400">
        {muted ? <VolumeX className="w-4 h-4"/> : <Volume2 className="w-4 h-4"/>}
      </button>

      <div className="flex flex-col lg:flex-row flex-1 gap-0">

        {/* ═══════════════════ LEFT — MAIN GAME AREA ═══════════════════ */}
        <div className="flex-1 flex flex-col p-4 md:p-6 gap-4">

          {/* Top HUD bar */}
          <div className="flex items-center justify-between glass rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400"/>
              <span className="text-xs font-black uppercase tracking-widest text-cyan-400">
                {match?.entryFee ?? '?'} Coin Arena
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
                <Users className="w-3.5 h-3.5"/>
                {players.length} players
              </span>
              <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-yellow-400"/>
                Pool: {match?.prizePool?.toLocaleString() ?? '?'}
              </span>
            </div>
          </div>

          {/* ── MULTIPLIER DISPLAY + CHART ── */}
          <div className={`relative flex-1 min-h-[320px] rounded-2xl border overflow-hidden
            flex flex-col items-center justify-center transition-all duration-500
            ${crashed
              ? 'bg-red-950/30 border-red-500/40'
              : gameState === 'playing'
              ? 'bg-black/60 border-cyan-500/20'
              : 'bg-black/40 border-white/10'}`}>

            {/* Grid background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage:'radial-gradient(circle, #00f0ff 1px, transparent 1px)', backgroundSize:'40px 40px'}}/>

            {/* ── SVG CHART ── */}
            {gameState === 'playing' || crashed ? (
              <svg ref={chartRef} viewBox={`0 0 ${W} ${H}`}
                className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={crashed ? '#ff3d3d' : '#00f0ff'} stopOpacity="0.3"/>
                    <stop offset="100%" stopColor={crashed ? '#ff3d3d' : '#00f0ff'} stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {/* Area fill */}
                {chartPoints.length > 1 && (() => {
                  const line = toSVG(chartPoints);
                  const maxX = Math.max(...chartPoints.map(p=>p.x),1);
                  const maxY = Math.max(...chartPoints.map(p=>p.y),1);
                  const endX = ((maxX)/maxX)*(W-40)+20;
                  const botY = H-20;
                  return (
                    <>
                      <path d={`${line} L${endX},${botY} L20,${botY} Z`}
                        fill="url(#lineGrad)" opacity="0.4"/>
                      <path d={line} fill="none"
                        stroke={crashed ? '#ff3d3d' : '#00f0ff'}
                        strokeWidth="2.5" strokeLinecap="round"/>
                    </>
                  );
                })()}
              </svg>
            ) : null}

            {/* ── COUNTDOWN OVERLAY ── */}
            {gameState === 'countdown' && (
              <AnimatePresence mode="wait">
                <motion.div key={countdown}
                  initial={{ scale:0.5, opacity:0 }}
                  animate={{ scale:1, opacity:1 }}
                  exit={{ scale:1.8, opacity:0 }}
                  className="flex flex-col items-center gap-2 z-10 select-none">
                  <Timer className="w-8 h-8 text-cyan-400 animate-pulse"/>
                  <span className="text-7xl font-black text-cyan-400 drop-shadow-[0_0_30px_rgba(0,240,255,0.5)]">
                    {countdown > 0 ? countdown : 'GO!'}
                  </span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Get ready to cash out!
                  </span>
                </motion.div>
              </AnimatePresence>
            )}

            {/* ── LIVE MULTIPLIER ── */}
            {(gameState === 'playing' || crashed) && (
              <div className="relative z-10 flex flex-col items-center gap-1 select-none">
                <motion.span
                  key={Math.floor(multiplier * 10)}
                  animate={{ scale:[1.05,1] }}
                  transition={{ duration:0.1 }}
                  className="text-6xl md:text-8xl font-black tabular-nums drop-shadow-2xl"
                  style={{ color: crashed ? '#ff3d3d' : multColour,
                           textShadow:`0 0 30px ${crashed ? 'rgba(255,61,61,0.5)' : 'rgba(0,240,255,0.4)'}` }}>
                  {(crashed ? (crashAt ?? multiplier) : multiplier).toFixed(2)}x
                </motion.span>
                {crashed && (
                  <motion.span initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                    className="text-red-400 font-black text-lg uppercase tracking-widest animate-pulse mt-1">
                    💥 CRASHED!
                  </motion.span>
                )}
              </div>
            )}

            {/* ── CASHOUT BUTTON ── */}
            {gameState === 'playing' && !myCashedOut && (
              <motion.button
                initial={{ y:20, opacity:0 }}
                animate={{ y:0, opacity:1 }}
                whileHover={{ scale:1.03 }}
                whileTap={{ scale:0.97 }}
                onClick={handleCashout}
                className="relative z-10 mt-6 px-10 py-4 rounded-2xl font-black text-black text-lg uppercase tracking-widest
                  bg-gradient-to-r from-cyan-400 to-violet-500
                  shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:shadow-[0_0_40px_rgba(0,240,255,0.6)]
                  transition-all flex flex-col items-center gap-0.5">
                <span>CASH OUT</span>
                <span className="text-sm font-bold opacity-80">
                  {Math.floor((myRecord?.stake ?? 0) * multiplier)} coins
                </span>
              </motion.button>
            )}

            {/* Already cashed out label */}
            {gameState === 'playing' && myCashedOut && (
              <div className="relative z-10 mt-6 px-8 py-3 rounded-2xl
                bg-green-500/15 border border-green-500/30 text-green-400 font-black uppercase tracking-widest text-sm text-center">
                ✓ Cashed out at {myRecord?.cashoutMultiplier?.toFixed(2)}x
                <span className="block text-xs opacity-70 mt-0.5">+{myRecord?.payout} coins secured</span>
              </div>
            )}
          </div>

          {/* ── CASHOUT TOAST ── */}
          <AnimatePresence>
            {cashoutMsg && (
              <motion.div
                initial={{ y:20, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:-20, opacity:0 }}
                className="glass rounded-xl p-3 border border-cyan-500/30 text-cyan-300 font-bold text-sm text-center">
                {cashoutMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── RISK STATS BAR ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:'Prize Pool', val:`${match?.prizePool ?? 0}`, icon: Coins, color:'text-yellow-400' },
              { label:'Max Safe Mult.', val:`${(match?.maxSafeMultiplier??1).toFixed(2)}x`, icon:TrendingUp, color:'text-cyan-400' },
              { label:'Your Stake', val:`${myRecord?.stake ?? 0}`, icon:LogOut, color:'text-violet-400' },
            ].map(({ label, val, icon: Icon, color }) => (
              <div key={label} className="glass rounded-xl p-3 border border-white/5 text-center">
                <Icon className={`w-4 h-4 ${color} mx-auto mb-1`}/>
                <div className={`text-sm font-black ${color}`}>{val}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════ RIGHT — LIVE PLAYERS SIDEBAR ═══════════════════ */}
        <div className="w-full lg:w-72 xl:w-80 bg-black/40 border-t lg:border-t-0 lg:border-l border-white/5
          p-4 flex flex-col gap-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Users className="w-4 h-4"/> Live Players
          </h2>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px] lg:max-h-none lg:flex-1">
            {players.map((p) => {
              const isSelf   = p.userId === user?.id;
              const cashed   = p.cashedOut;
              const liveVal  = !cashed && gameState === 'playing'
                ? Math.floor(p.stake * multiplier) : (p.payout ?? 0);

              return (
                <div key={p.userId}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-all
                    ${isSelf ? 'bg-cyan-500/10 border-cyan-500/30' :
                      cashed ? 'bg-green-500/5 border-green-500/20' : 'bg-white/3 border-white/5'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${cashed ? 'bg-green-400' : crashed ? 'bg-red-400' : 'bg-cyan-400 animate-pulse'}`}/>
                    <span className="font-bold truncate max-w-[90px]">
                      {p.username}{isSelf ? ' (you)' : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    {cashed ? (
                      <>
                        <span className="text-green-400 font-black block">+{p.payout}</span>
                        <span className="text-green-300/60 block text-[10px]">{p.cashoutMultiplier?.toFixed(2)}x</span>
                      </>
                    ) : crashed ? (
                      <span className="text-red-400 font-black">-{p.stake}</span>
                    ) : (
                      <span className="text-white font-black">{liveVal}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Back button */}
          <button onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center gap-1.5 border border-white/10 text-gray-400 hover:text-white
            px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:border-white/20 mt-auto">
            <ArrowLeft className="w-3.5 h-3.5"/> Dashboard
          </button>
        </div>
      </div>

      {/* ══════════════════ CRASH / WIN RESULT MODAL ══════════════════ */}
      <AnimatePresence>
        {crashed && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div initial={{scale:0.9,y:30}} animate={{scale:1,y:0}}
              className="w-full max-w-sm glass p-8 rounded-2xl border text-center flex flex-col gap-5
                border-red-500/30">

              <div className="text-5xl">{gameState === 'ended' ? '🏆' : '💥'}</div>

              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest">
                  {gameState === 'ended' ? 'Round Complete' : 'CRASHED!'}
                </h2>
                <p className="text-sm font-bold mt-1"
                  style={{ color: gameState==='ended' ? '#00ff66' : '#ff3d3d' }}>
                  {gameState === 'ended'
                    ? `All players cashed out safely!`
                    : `Crashed at ${(crashAt??0).toFixed(2)}x`}
                </p>
              </div>

              {/* My result */}
              <div className={`p-4 rounded-xl border ${didIWin
                ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/20'}`}>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  My Result
                </span>
                {didIWin ? (
                  <span className="text-xl font-black text-green-400">
                    +{myRecord?.payout} coins @ {myRecord?.cashoutMultiplier?.toFixed(2)}x
                  </span>
                ) : myCashedOut ? (
                  <span className="text-xl font-black text-green-400">
                    +{myRecord?.payout} coins
                  </span>
                ) : (
                  <span className="text-xl font-black text-red-400">
                    -{myRecord?.stake} coins (no cashout)
                  </span>
                )}
              </div>

              {/* All players summary */}
              <div className="flex flex-col gap-1.5 text-xs text-left max-h-40 overflow-y-auto">
                {players.map((p, i) => (
                  <div key={p.userId} className="flex justify-between font-bold border-b border-white/5 pb-1">
                    <span className="text-gray-300">{i+1}. {p.username}</span>
                    <span className={p.cashedOut ? 'text-green-400' : 'text-red-400'}>
                      {p.cashedOut ? `+${p.payout} @ ${p.cashoutMultiplier?.toFixed(2)}x` : `Lost ${p.stake}`}
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={() => router.push('/dashboard')}
                className="w-full bg-gradient-to-r from-cyan-400 to-violet-500
                text-black font-black tracking-widest py-3 rounded-xl hover:scale-[1.01] transition-all">
                PLAY AGAIN
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
