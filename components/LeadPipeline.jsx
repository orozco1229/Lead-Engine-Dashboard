'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { getStyle, getAction } from '../lib/statusMap';

function StatusPill({ status }) {
  const s = getStyle(status);
  return (
    <span
      style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 12px' }}
      className="text-xs font-semibold flex items-center gap-1.5 w-fit"
    >
      <span style={{ background: s.dot, width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
      {status}
    </span>
  );
}

export default function LeadPipeline({ leads, onAction }) {
  return (
    <div style={{ borderRadius: 16, background: '#111827', border: '1px solid rgba(255,255,255,0.06)' }} className="p-6">
      <h2 className="text-base font-semibold text-slate-300 mb-4 uppercase tracking-widest">Live Pipeline</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-800">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Business</th>
              <th className="pb-3 font-medium">Phone</th>
              <th className="pb-3 font-medium">Email</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Source</th>
              <th className="pb-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {leads.map((lead) => {
                const action = getAction(lead.status);
                return (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25 }}
                    className="border-b border-slate-800/50"
                  >
                    <td className="py-3 pr-4 font-medium text-white">{lead.name}</td>
                    <td className="py-3 pr-4 text-slate-400">{lead.business}</td>
                    <td className="py-3 pr-4 text-slate-400">{lead.phone}</td>
                    <td className="py-3 pr-4 text-slate-400">{lead.email}</td>
                    <td className="py-3 pr-4"><StatusPill status={lead.status} /></td>
                    <td className="py-3 pr-4 text-slate-500">{lead.source}</td>
                    <td className="py-3">
                      {action && (
                        <button
                          onClick={() => onAction(lead.id, action.next)}
                          style={{ background: '#F59E0B', color: '#0B1120', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          className="hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                          {action.label}
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {leads.length === 0 && (
          <p className="text-slate-600 text-center py-8">
            No leads yet — drop a CSV or import from Apollo above
          </p>
        )}
      </div>
    </div>
  );
}
