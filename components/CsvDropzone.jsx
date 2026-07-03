'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
  });
}

export default function CsvDropzone({ clientId, onImported }) {
  const [state, setState] = useState('idle');
  const [count, setCount] = useState(0);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.csv')) return;
    setState('loading');
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, rows }),
      });
      const data = await res.json();
      setCount(data.created);
      setState('done');
      onImported?.();
      setTimeout(() => setState('idle'), 4000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  const label = {
    idle:    'Drop CSV here or click to upload',
    loading: 'Importing leads...',
    done:    `${count} leads imported`,
    error:   'Import failed — check CSV format',
  }[state];

  return (
    <div
      onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => state === 'idle' && inputRef.current?.click()}
      style={{
        border: '1.5px dashed',
        borderColor: state === 'done' ? '#22c55e' : state === 'error' ? '#ef4444' : 'rgba(245,158,11,0.3)',
        borderRadius: 12,
        padding: '14px 20px',
        cursor: state === 'idle' ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: state === 'done' ? '#4ade80' : state === 'error' ? '#f87171' : '#64748b',
        fontSize: 13,
        transition: 'all 0.2s',
      }}
    >
      <Upload size={16} />
      <span>{label}</span>
      <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])} />
    </div>
  );
}
