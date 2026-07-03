const ACTIONS = {
  'New':           { label: 'Mark Attempted',  next: 'Attempted' },
  'Attempted':     { label: 'Mark Contacted',  next: 'Contacted' },
  'Contacted':     { label: 'Send Proposal',   next: 'Proposal Sent' },
  'Responded':     { label: 'Send Proposal',   next: 'Proposal Sent' },
  'Proposal Sent': { label: 'Close Won',       next: 'Closed-Won' },
};

const STYLES = {
  'New':            { color: '#94a3b8', bg: '#1e293b', dot: '#64748b' },
  'Attempted':      { color: '#94a3b8', bg: '#1e293b', dot: '#64748b' },
  'Contacted':      { color: '#60a5fa', bg: '#172554', dot: '#3b82f6' },
  'Responded':      { color: '#60a5fa', bg: '#172554', dot: '#3b82f6' },
  'Proposal Sent':  { color: '#a78bfa', bg: '#2e1065', dot: '#8b5cf6' },
  'Closed-Won':     { color: '#4ade80', bg: '#052e16', dot: '#22c55e' },
  'Not Interested': { color: '#f87171', bg: '#2d0f0f', dot: '#ef4444' },
  'Do Not Contact': { color: '#f87171', bg: '#2d0f0f', dot: '#ef4444' },
};

const GROUP = {
  'New': 'Pending', 'Attempted': 'Pending',
  'Contacted': 'Active', 'Responded': 'Active', 'Proposal Sent': 'Active',
  'Closed-Won': 'Won',
  'Not Interested': 'Lost', 'Do Not Contact': 'Lost',
};

export function getGroup(status) {
  return GROUP[status] || 'Pending';
}

export function getStyle(status) {
  return STYLES[status] || STYLES['New'];
}

export function getAction(status) {
  return ACTIONS[status] || null;
}
