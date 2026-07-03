'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Square } from 'lucide-react';
import MagneticButton from './MagneticButton';

const RAIL_MSGS = [
  'Scanning Google Maps listings…',
  'Pulling contact emails from directories…',
  'Cross-referencing social profiles…',
  'Enriching phone numbers via Twilio Lookup…',
  'Scoring intent signals…',
  'Routing hot leads to CRM…',
  'Detecting unanswered reviews…',
  'Queuing SMS follow-up sequences…',
];

export default function CommandCenter({ running, onStart, onStop, ticker }) {
  const msg = RAIL_MSGS[ticker % RAIL_MSGS.length];

  return (
    <div
      style={{ borderRadius: 20, background: 'linear-gradient(135deg, #111827 0%, #0B1120 100%)', border: '1px solid rgba(245,158,11,0.18)' }}
      className="p-8 flex flex-col gap-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">LeadEngine</h1>
          <p className="text-slate-400 text-sm mt-0.5">Cold lead revenue system</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ opacity: running ? [1, 0.3, 1] : 0.25 }}
            transition={{ duration: 1.2, repeat: running ? Infinity : 0 }}
            style={{ width: 10, height: 10, borderRadius: '50%', background: running ? '#22c55e' : '#475569', display: 'inline-block' }}
          />
          <span className="text-xs font-medium text-slate-400">{running ? 'LIVE' : 'IDLE'}</span>
        </div>
      </div>

      {/* Status rail */}
      <div style={{ background: '#060C18', borderRadius: 10, minHeight: 36, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }} className="px-4 py-2">
        <AnimatePresence mode="wait">
          {running ? (
            <motion.p
              key={msg}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-xs text-slate-400 font-mono"
            >
              <span style={{ color: '#F59E0B' }}>&gt; </span>{msg}
            </motion.p>
          ) : (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-slate-600 font-mono"
            >
              Engine idle — start to begin lead generation
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        {!running ? (
          <MagneticButton
            onClick={onStart}
            className="flex items-center gap-2 px-10 py-4 text-base font-bold text-navy-900 rounded-2xl transition-all"
            style={{ background: '#F59E0B', color: '#0B1120', borderRadius: 16, fontSize: 16, fontWeight: 700, padding: '16px 40px', border: 'none', cursor: 'pointer' }}
          >
            <Zap size={20} />
            Start Engine
          </MagneticButton>
        ) : (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onStop}
            style={{ background: '#1e293b', color: '#f87171', borderRadius: 16, fontSize: 14, fontWeight: 600, padding: '12px 32px', border: '1px solid #ef444430', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Square size={16} />
            Stop Engine
          </motion.button>
        )}
      </div>
    </div>
  );
}
