'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

function AnimatedNumber({ value }) {
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

export default function MetricCard({ label, value, suffix = '', icon: Icon, color = '#F59E0B' }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{
        y: hovered ? -6 : 0,
        boxShadow: hovered
          ? `0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px ${color}40`
          : '0 4px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06)',
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      style={{ borderRadius: 16, background: '#111827' }}
      className="p-6 cursor-default"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">{label}</span>
        {Icon && (
          <span style={{ color }} className="opacity-80">
            <Icon size={18} />
          </span>
        )}
      </div>
      <div className="text-4xl font-bold text-white">
        <AnimatedNumber value={typeof value === 'number' ? value : 0} />
        {suffix && <span className="text-xl ml-1 text-slate-400">{suffix}</span>}
      </div>
    </motion.div>
  );
}
