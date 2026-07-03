'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Users, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import ClientTabs from '../components/ClientTabs';
import CsvDropzone from '../components/CsvDropzone';
import LeadPipeline from '../components/LeadPipeline';
import { getGroup } from '../lib/statusMap';

export default function Home() {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [apolloStatus, setApolloStatus] = useState('idle');
  const refreshRef = useRef(null);

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => {
        setClients(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) setActiveClient(data[0]);
      })
      .catch(() => setClients([]));
  }, []);

  const fetchLeads = useCallback(async (client) => {
    if (!client) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?clientId=${client.id}`);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeClient) return;
    fetchLeads(activeClient);
    clearInterval(refreshRef.current);
    refreshRef.current = setInterval(() => fetchLeads(activeClient), 30000);
    return () => clearInterval(refreshRef.current);
  }, [activeClient, fetchLeads]);

  function selectClient(client) {
    setActiveClient(client);
    setLeads([]);
    setApolloStatus('idle');
  }

  async function syncNow() {
    if (!activeClient) return;
    setSyncing(true);
    await fetchLeads(activeClient);
    setSyncing(false);
  }

  async function handleAction(leadId, nextStatus) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l)));
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {
      fetchLeads(activeClient);
    }
  }

  async function importApollo() {
    if (!activeClient || apolloStatus === 'loading') return;
    setApolloStatus('loading');
    try {
      const res = await fetch('/api/import/apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: activeClient.id }),
      });
      const data = await res.json();
      setApolloStatus(`done:${data.created}`);
      fetchLeads(activeClient);
      setTimeout(() => setApolloStatus('idle'), 4000);
    } catch {
      setApolloStatus('error');
      setTimeout(() => setApolloStatus('idle'), 3000);
    }
  }

  const pending = leads.filter((l) => getGroup(l.status) === 'Pending').length;
  const active  = leads.filter((l) => getGroup(l.status) === 'Active').length;
  const won     = leads.filter((l) => getGroup(l.status) === 'Won').length;

  const apolloLabel =
    apolloStatus === 'loading'            ? 'Importing...' :
    apolloStatus.startsWith('done:')      ? `${apolloStatus.split(':')[1]} imported` :
    apolloStatus === 'error'              ? 'Import failed' :
    'Import from Apollo';

  const apolloColor =
    apolloStatus.startsWith('done:') ? '#4ade80' :
    apolloStatus === 'error'         ? '#f87171' :
    '#94a3b8';

  return (
    <main className="min-h-screen" style={{ background: '#0B1120', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B', letterSpacing: '-0.5px' }}>LeadEngine</h1>
            <p style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>Real-time pipeline — powered by Airtable</p>
          </div>
          <button
            onClick={syncNow}
            disabled={syncing || !activeClient}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 10, padding: '8px 16px',
              color: '#F59E0B', fontSize: 13, fontWeight: 600,
              cursor: syncing || !activeClient ? 'default' : 'pointer',
              opacity: !activeClient ? 0.4 : 1,
            }}
          >
            <RefreshCw
              size={14}
              style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}
            />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {/* Client Tabs */}
        <div>
          <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Clients
          </p>
          <ClientTabs clients={clients} activeId={activeClient?.id} onSelect={selectClient} />
        </div>

        {/* Import Bar */}
        {activeClient && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <div style={{ flex: 1 }}>
              <CsvDropzone clientId={activeClient.id} onImported={() => fetchLeads(activeClient)} />
            </div>
            <button
              onClick={importApollo}
              disabled={apolloStatus === 'loading'}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '12px 20px',
                color: apolloColor, fontSize: 13, fontWeight: 500,
                cursor: apolloStatus === 'loading' ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s',
              }}
            >
              {apolloLabel}
            </button>
          </div>
        )}

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <MetricCard label="Total Leads" value={leads.length} icon={Users}      color="#F59E0B" />
          <MetricCard label="Pending"     value={pending}      icon={RefreshCw}  color="#94a3b8" />
          <MetricCard label="In Progress" value={active}       icon={TrendingUp} color="#60a5fa" />
          <MetricCard label="Closed Won"  value={won}          icon={DollarSign} color="#4ade80" />
        </div>

        {/* Pipeline */}
        {loading && leads.length === 0 ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: '48px 0', fontSize: 14 }}>
            Loading leads...
          </div>
        ) : (
          <LeadPipeline leads={leads} onAction={handleAction} />
        )}

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
