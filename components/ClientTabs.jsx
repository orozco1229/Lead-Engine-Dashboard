'use client';

export default function ClientTabs({ clients, activeId, onSelect }) {
  if (!clients.length) {
    return (
      <div style={{ color: '#475569', fontSize: 14, padding: '12px 0' }}>
        No clients found — add clients in Airtable first.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {clients.map((client) => {
        const isActive = client.id === activeId;
        return (
          <button
            key={client.id}
            onClick={() => onSelect(client)}
            style={{
              padding: '8px 20px',
              borderRadius: 10,
              border: isActive ? '1px solid #F59E0B' : '1px solid rgba(255,255,255,0.08)',
              background: isActive ? 'rgba(245,158,11,0.12)' : '#111827',
              color: isActive ? '#F59E0B' : '#94a3b8',
              fontWeight: isActive ? 700 : 400,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {client.name}
          </button>
        );
      })}
    </div>
  );
}
