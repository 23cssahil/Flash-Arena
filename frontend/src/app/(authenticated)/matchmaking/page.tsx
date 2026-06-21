'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '../../../context/SocketContext';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, Users } from 'lucide-react';

export default function MatchmakingPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const entryFee     = parseInt(searchParams.get('entryFee') ?? '10', 10);

  const { socket, connected } = useSocket();

  const [phase,  setPhase]  = useState<'connecting'|'searching'|'found'|'failed'>('connecting');
  const [errMsg, setErrMsg] = useState<string|null>(null);
  const [pulse,  setPulse]  = useState(0);

  // Radar pulse counter for animation
  useEffect(() => {
    const t = setInterval(() => setPulse(p => p + 1), 1200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!socket || !connected) { setPhase('connecting'); return; }

    setPhase('searching');
    socket.emit('join_queue', { entryFee });

    socket.on('queue_joined', () => setPhase('searching'));

    socket.on('error_alert', (d: { message: string }) => {
      setErrMsg(d.message);
      setPhase('failed');
    });

    const matchEvent = `match_found:${entryFee}`;
    socket.on(matchEvent, (d: { matchId: string; roomId: string }) => {
      setPhase('found');
      socket.emit('join_room', { roomId: d.roomId });
      setTimeout(() => router.push(`/game/${d.matchId}`), 1200);
    });

    return () => {
      socket.emit('leave_queue', { entryFee });
      socket.off('queue_joined');
      socket.off('error_alert');
      socket.off(matchEvent);
    };
  }, [socket, connected, entryFee, router]);

  const cancel = () => {
    socket?.emit('leave_queue', { entryFee });
    router.push('/dashboard');
  };

  const PHASE_LABEL: Record<string, string> = {
    connecting: 'Connecting to server…',
    searching:  'Scanning for opponents…',
    found:      'Match found! Entering lobby…',
    failed:     errMsg ?? 'Something went wrong.',
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-16 relative">

      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96
        rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none"/>

      <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
        className="flex flex-col items-center gap-8 relative z-10 text-center max-w-sm w-full px-4">

        <div>
          <h1 className="text-xl font-black uppercase tracking-widest text-white">Finding Match</h1>
          <p className="text-xs text-cyan-400 font-bold uppercase mt-1">{entryFee} Coin Crash Arena</p>
        </div>

        {/* Radar scanner */}
        <div className="relative w-52 h-52">
          {/* Static rings */}
          {[1,2,3].map(r => (
            <div key={r} className="absolute inset-0 rounded-full border border-cyan-500/15"
              style={{ margin: `${r*18}px` }}/>
          ))}
          {/* Pulse ring */}
          <motion.div key={pulse}
            initial={{ scale:0.4, opacity:0.8 }}
            animate={{ scale:1, opacity:0 }}
            transition={{ duration:1.2, ease:'easeOut' }}
            className={`absolute inset-0 rounded-full border-2 ${phase==='found' ? 'border-green-400' : 'border-cyan-400'}`}/>

          {/* Centre dot */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-14 h-14 rounded-full flex items-center justify-center
            ${phase==='found' ? 'bg-green-500/20 border-2 border-green-400' : 'bg-cyan-500/15 border-2 border-cyan-400'}`}>
            {phase === 'found' ? (
              <span className="text-xl text-green-400 font-black">✓</span>
            ) : phase === 'failed' ? (
              <span className="text-xl text-red-400">✕</span>
            ) : (
              <TrendingUp className="w-6 h-6 text-cyan-400 animate-pulse"/>
            )}
          </div>

          {/* Spin sweep (searching only) */}
          {(phase === 'searching' || phase === 'connecting') && (
            <div className="absolute inset-0 rounded-full overflow-hidden"
              style={{ animation:'spin 2.5s linear infinite' }}>
              <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left
                bg-gradient-to-r from-cyan-400/80 to-transparent"/>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex flex-col items-center gap-2">
          <p className={`text-sm font-bold uppercase tracking-wider
            ${phase==='found' ? 'text-green-400' : phase==='failed' ? 'text-red-400' : 'text-gray-300'}`}>
            {PHASE_LABEL[phase]}
          </p>
          {phase === 'searching' && (
            <p className="text-xs text-gray-500 font-semibold flex items-center gap-1">
              <Users className="w-3.5 h-3.5"/> Waiting for 3 players to fill lobby
            </p>
          )}
        </div>

        {/* Cancel */}
        <button onClick={cancel}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider
          text-gray-400 hover:text-red-400 border border-transparent hover:border-red-500/20
          px-5 py-2.5 rounded-xl transition-all">
          <ArrowLeft className="w-4 h-4"/>
          {phase === 'failed' ? 'Back to Dashboard' : 'Cancel'}
        </button>
      </motion.div>
    </div>
  );
}
