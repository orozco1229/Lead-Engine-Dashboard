'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Users, TrendingUp, DollarSign, Clock } from 'lucide-react';
import CommandCenter from '../components/CommandCenter';
import MetricCard from '../components/MetricCard';
import LeadPipeline from '../components/LeadPipeline';

const SEED_LEADS = [
  { id: 1,  name: 'Mario Negron',    business: 'Negron Auto Repair',    status: 'Enriched', source: 'Google Maps' },
  { id: 2,  name: 'Elsie Castillo',  business: 'Castillo Boutique',     status: 'Pending',  source: 'Yelp'        },
  { id: 3,  name: 'Corey Lipscomb',  business: 'Lipscomb Landscaping',  status: 'Failed',   source: 'Facebook'    },
  { id: 4,  name: 'Eddie Garza',     business: 'Garza Tax Services',    status: 'Pending',  source: 'Google Maps' },
  { id: 5,  name: 'Kim Le',          business: 'Le Nail Studio',        status: 'Enriched', source: 'Yelp'        },
  { id: 6,  name: 'Logan Lester',    business: 'Lester Plumbing Co.',   status: 'Pending',  source: 'BBB'         },
];

const NAMES = [
  ['Sarah Mitchell', 'Mitchell Bakery'],
  ['Carlos Rivera', 'Rivera HVAC'],
  ['Priya Patel', 'Patel Dental'],
  ['James Okonkwo', 'Okonkwo Law Group'],
  ['Amanda Torres', 'Torres Photography'],
  ['Derek Huang', 'Huang Roofing'],
  ['Nicole Freeman', 'Freeman Spa'],
  ['Brandon Ellis', 'Ellis Auto Glass'],
];

const SOURCES = ['Google Maps', 'Yelp', 'Facebook', 'BBB', 'Instagram'];

let nextId = 100;

export default function Home() {
  const [running, setRunning] = useState(false);
  const [leads, setLeads] = useState(SEED_LEADS);
  const [ticker, setTicker] = useState(0);
  const [metrics, setMetrics] = useState({ total: 6, enriched: 2, revenue: 0, avgTime: 0 });
  const intervalRef = useRef(null);
  const tickRef = useRef(null);

  const addLead = useCallback(() => {
    const [name, business] = NAMES[nextId % NAMES.length];
    const source = SOURCES[nextId % SOURCES.length];
    const newLead = { id: nextId++, name, business, status: 'Pending', source };
    setLeads((prev) => [newLead, ...prev].slice(0, 20));
    setMetrics((m) => ({ ...m, total: m.total + 1 }));

    // auto-resolve after 3s
    setTimeout(() => {
      const resolved = Math.random() > 0.25 ? 'Enriched' : 'Failed';
      setLeads((prev) => prev.map((l) => (l.id === newLead.id ? { ...l, status: resolved } : l)));
      if (resolved === 'Enriched') {
        setMetrics((m) => ({
          ...m,
          enriched: m.enriched + 1,
          revenue: m.revenue + Math.floor(Math.random() * 800 + 200),
          avgTime: Math.round((m.avgTime * m.enriched + 3) / (m.enriched + 1)),
        }));
      }
    }, 3000);
  }, []);

  function start() {
    setRunning(true);
    intervalRef.current = setInterval(addLead, 2200);
    tickRef.current = setInterval(() => setTicker((t) => t + 1), 1800);
  }

  function stop() {
    setRunning(false);
    clearInterval(intervalRef.current);
    clearInterval(tickRef.current);
  }

  useEffect(() => () => { clearInterval(intervalRef.current); clearInterval(tickRef.current); }, []);

  function resolveManually(id) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'Enriched' } : l)));
    setMetrics((m) => ({
      ...m,
      enriched: m.enriched + 1,
      revenue: m.revenue + Math.floor(Math.random() * 600 + 150),
    }));
  }

  return (
    <main className="min-h-screen" style={{ background: '#0B1120', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Command Center */}
        <CommandCenter running={running} onStart={start} onStop={stop} ticker={ticker} />

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <MetricCard label="Total Leads"     value={metrics.total}    icon={Users}       color="#F59E0B" />
          <MetricCard label="Enriched"        value={metrics.enriched} icon={TrendingUp}  color="#22c55e" />
          <MetricCard label="Revenue Unlocked" value={metrics.revenue}  suffix="$"         icon={DollarSign} color="#818cf8" />
          <MetricCard label="Avg. Resolve (s)" value={metrics.avgTime}  icon={Clock}       color="#38bdf8" />
        </div>

        {/* Pipeline */}
        <LeadPipeline leads={leads} onResolve={resolveManually} />

      </div>
    </main>
  );
}
