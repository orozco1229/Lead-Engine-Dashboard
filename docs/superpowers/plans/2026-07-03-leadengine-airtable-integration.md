# LeadEngine Dashboard — Airtable Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the LeadEngine Dashboard to Airtable so all lead data is real, persistent, and organized per client with CSV import, Apollo import, two-way status sync, and 30-second auto-refresh.

**Architecture:** Next.js API routes act as the bridge between the React frontend and Airtable — the browser never touches Airtable directly. A shared `lib/airtable.js` handles all auth and fetch logic. A `lib/statusMap.js` maps Airtable's 8 status values to 4 visual groups (Pending/Active/Won/Lost) and determines what action button each lead shows.

**Tech Stack:** Next.js 15 App Router, Airtable REST API, Apollo Contacts API, Framer Motion, Tailwind CSS, Railway

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/airtable.js` | Create | Shared Airtable fetch client + table IDs |
| `lib/statusMap.js` | Create | Status → display group mapping + action button logic |
| `app/api/clients/route.js` | Create | GET /api/clients |
| `app/api/leads/route.js` | Create | GET /api/leads?clientId= |
| `app/api/leads/[id]/route.js` | Create | PATCH /api/leads/[id] |
| `app/api/import/csv/route.js` | Create | POST /api/import/csv |
| `app/api/import/apollo/route.js` | Create | POST /api/import/apollo |
| `components/ClientTabs.jsx` | Create | Client tab bar |
| `components/CsvDropzone.jsx` | Create | Drag-and-drop CSV import per tab |
| `app/page.jsx` | Rewrite | Wire all components to real API, add tabs + dropzone |
| `components/LeadPipeline.jsx` | Rewrite | 4-group status pills, contextual action buttons |
| `components/CommandCenter.jsx` | Delete | Replaced by Sync Now button in page.jsx |
| `components/MagneticButton.jsx` | Delete | No longer used |

---

## Task 1: Airtable schema — add Client linked field

No code. One field added in the Airtable UI to link leads to clients.

- [ ] **Step 1.1:** Open Airtable → Orozco Ventures OS → Leads table
- [ ] **Step 1.2:** Click "+ Add field" → "Link to another record" → choose **Clients** table → name it **Client** → Save
- [ ] **Step 1.3:** Verify: open any lead record, confirm the "Client" field appears with a dropdown to pick a client
- [ ] **Step 1.4:** Link at least 2–3 test leads to a client so the API has data to return during development

---

## Task 2: Set Railway environment variables

The API routes fail silently without these. Set them before writing code.

- [ ] **Step 2.1:** Get Airtable personal access token:
  - Go to https://airtable.com/account → API section → Create personal access token
  - Required scopes: `data.records:read`, `data.records:write`, `schema.bases:read`
  - Copy the token (starts with `pat...`)

- [ ] **Step 2.2:** Get Apollo API key:
  - Go to https://developer.apollo.io/ → API keys → copy your key

- [ ] **Step 2.3:** Set all three variables via Railway CLI:

```bash
cd C:\leadengine
railway variables set AIRTABLE_API_KEY=your_pat_token_here --service 38a13394-1007-490d-9d2b-78322502a249
railway variables set AIRTABLE_BASE_ID=app42YJq8Esmt8YLh --service 38a13394-1007-490d-9d2b-78322502a249
railway variables set APOLLO_API_KEY=your_apollo_key_here --service 38a13394-1007-490d-9d2b-78322502a249
```

- [ ] **Step 2.4:** Verify all three are set:

```bash
railway variables list --service 38a13394-1007-490d-9d2b-78322502a249 --json
```

Expected: JSON object showing AIRTABLE_API_KEY, AIRTABLE_BASE_ID, APOLLO_API_KEY.

---

## Task 3: Airtable client library

- [ ] **Step 3.1:** Create `lib/airtable.js`:

```js
const BASE_URL = 'https://api.airtable.com/v0';
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const API_KEY = process.env.AIRTABLE_API_KEY;

export const CLIENTS_TABLE = 'tblEpKpkRGnLenaVC';
export const LEADS_TABLE = 'tbl1v2uwQtVXz8vdI';

function headers() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function airtableFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}/${BASE_ID}${path}`, {
    ...options,
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable ${res.status}: ${text}`);
  }
  return res.json();
}
```

- [ ] **Step 3.2:** Commit:

```bash
git add lib/airtable.js
git commit -m "feat: add Airtable client library"
```

---

## Task 4: Status mapping utility

- [ ] **Step 4.1:** Create `lib/statusMap.js`:

```js
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
```

- [ ] **Step 4.2:** Commit:

```bash
git add lib/statusMap.js
git commit -m "feat: add status mapping utility"
```

---

## Task 5: GET /api/clients

- [ ] **Step 5.1:** Create `app/api/clients/route.js`:

```js
import { airtableFetch, CLIENTS_TABLE } from '../../../lib/airtable';

export async function GET() {
  const data = await airtableFetch(
    `/${CLIENTS_TABLE}?fields[]=Name&fields[]=Brokerage&sort[0][field]=Name&sort[0][direction]=asc`
  );
  const clients = data.records.map((r) => ({
    id: r.id,
    name: r.fields.Name || 'Unnamed Client',
    brokerage: r.fields.Brokerage || '',
  }));
  return Response.json(clients);
}
```

- [ ] **Step 5.2:** Start dev server and test:

```bash
cd C:\leadengine
npm run dev
```

In a new terminal (Git Bash or PowerShell):
```bash
curl http://localhost:3000/api/clients
```

Expected: `[{"id":"recXXX","name":"...","brokerage":"..."},...]`

- [ ] **Step 5.3:** Commit:

```bash
git add app/api/clients/route.js
git commit -m "feat: add GET /api/clients route"
```

---

## Task 6: GET /api/leads

- [ ] **Step 6.1:** Create `app/api/leads/route.js`:

```js
import { airtableFetch, LEADS_TABLE } from '../../../lib/airtable';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  if (!clientId) return Response.json({ error: 'clientId required' }, { status: 400 });

  const formula = encodeURIComponent(`FIND("${clientId}", ARRAYJOIN({Client}))`);
  const fields = ['Name', 'Status', 'Phone', 'Email', 'Brokerage', 'Source', 'City', 'Notes'];
  const fieldParams = fields.map((f) => `fields[]=${encodeURIComponent(f)}`).join('&');

  const data = await airtableFetch(
    `/${LEADS_TABLE}?filterByFormula=${formula}&${fieldParams}&sort[0][field]=Name&sort[0][direction]=asc`
  );

  const leads = data.records.map((r) => ({
    id: r.id,
    name: r.fields.Name || '',
    status: r.fields.Status || 'New',
    phone: r.fields.Phone || '',
    email: r.fields.Email || '',
    business: r.fields.Brokerage || '',
    source: r.fields.Source || '',
    city: r.fields.City || '',
    notes: r.fields.Notes || '',
  }));

  return Response.json(leads);
}
```

- [ ] **Step 6.2:** Test (replace recXXX with a real client ID from Task 5.2):

```bash
curl "http://localhost:3000/api/leads?clientId=recXXX"
```

Expected: JSON array of leads for that client. Empty array `[]` if no leads linked yet (go back to Airtable and link some via Task 1.4).

- [ ] **Step 6.3:** Commit:

```bash
git add app/api/leads/route.js
git commit -m "feat: add GET /api/leads route"
```

---

## Task 7: PATCH /api/leads/[id]

- [ ] **Step 7.1:** Create the directory (bracket in name is literal):

```bash
mkdir "C:\leadengine\app\api\leads\[id]"
```

- [ ] **Step 7.2:** Create `app/api/leads/[id]/route.js`:

```js
import { airtableFetch, LEADS_TABLE } from '../../../../lib/airtable';

const VALID_STATUSES = [
  'New', 'Attempted', 'Contacted', 'Responded',
  'Proposal Sent', 'Closed-Won', 'Not Interested', 'Do Not Contact',
];

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { status } = await request.json();

  if (!VALID_STATUSES.includes(status)) {
    return Response.json({ error: `Invalid status: ${status}` }, { status: 400 });
  }

  const data = await airtableFetch(`/${LEADS_TABLE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { Status: status } }),
  });

  return Response.json({ id: data.id, status: data.fields.Status });
}
```

- [ ] **Step 7.3:** Test (replace recXXX with a real lead ID from Task 6.2):

```bash
curl -X PATCH http://localhost:3000/api/leads/recXXX \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"Attempted\"}"
```

Expected: `{"id":"recXXX","status":"Attempted"}`
Verify in Airtable: the lead's Status field should now show "Attempted".

- [ ] **Step 7.4:** Commit:

```bash
git add "app/api/leads/[id]/route.js"
git commit -m "feat: add PATCH /api/leads/[id] route"
```

---

## Task 8: POST /api/import/csv

- [ ] **Step 8.1:** Create `app/api/import/csv/route.js`:

```js
import { airtableFetch, LEADS_TABLE } from '../../../../lib/airtable';

const COL_MAP = {
  'name': 'Name', 'full name': 'Name',
  'email': 'Email',
  'phone': 'Phone', 'phone number': 'Phone',
  'company': 'Brokerage', 'brokerage': 'Brokerage', 'business': 'Brokerage',
  'source': 'Source',
  'city': 'City',
  'notes': 'Notes',
};

function mapRow(row, clientId) {
  const fields = { Client: [clientId], Status: 'New' };
  for (const [col, val] of Object.entries(row)) {
    const airtableField = COL_MAP[col.toLowerCase().trim()];
    if (airtableField && val) fields[airtableField] = String(val).trim();
  }
  return fields;
}

export async function POST(request) {
  const { clientId, rows } = await request.json();
  if (!clientId || !Array.isArray(rows)) {
    return Response.json({ error: 'clientId and rows required' }, { status: 400 });
  }

  let created = 0;
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const records = batch.map((row) => ({ fields: mapRow(row, clientId) }));
    const result = await airtableFetch(`/${LEADS_TABLE}`, {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
    created += result.records.length;
  }

  return Response.json({ created });
}
```

- [ ] **Step 8.2:** Test:

```bash
curl -X POST http://localhost:3000/api/import/csv \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"recXXX\",\"rows\":[{\"name\":\"Test Lead\",\"email\":\"test@test.com\",\"phone\":\"555-1234\",\"company\":\"Test Biz\"}]}"
```

Expected: `{"created":1}`
Verify in Airtable: new lead "Test Lead" tagged to that client.

- [ ] **Step 8.3:** Commit:

```bash
git add app/api/import/csv/route.js
git commit -m "feat: add POST /api/import/csv route"
```

---

## Task 9: POST /api/import/apollo

- [ ] **Step 9.1:** Create `app/api/import/apollo/route.js`:

```js
import { airtableFetch, LEADS_TABLE } from '../../../../lib/airtable';

export async function POST(request) {
  const { clientId } = await request.json();
  if (!clientId) return Response.json({ error: 'clientId required' }, { status: 400 });

  const apolloRes = await fetch('https://api.apollo.io/api/v1/contacts/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: JSON.stringify({
      api_key: process.env.APOLLO_API_KEY,
      page: 1,
      per_page: 100,
      sort_by_field: 'created_at',
      sort_ascending: false,
    }),
  });

  if (!apolloRes.ok) {
    return Response.json({ error: 'Apollo API error' }, { status: 502 });
  }

  const apolloData = await apolloRes.json();
  const contacts = apolloData.contacts || [];

  if (contacts.length === 0) {
    return Response.json({ created: 0, message: 'No contacts found in Apollo account' });
  }

  let created = 0;
  for (let i = 0; i < contacts.length; i += 10) {
    const batch = contacts.slice(i, i + 10);
    const records = batch.map((c) => ({
      fields: {
        Client: [clientId],
        Status: 'New',
        Name: [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unknown',
        Email: c.email || '',
        Phone: c.phone_numbers?.[0]?.sanitized_number || '',
        Brokerage: c.organization_name || '',
        City: c.city || '',
        Source: 'Apollo',
      },
    }));
    const result = await airtableFetch(`/${LEADS_TABLE}`, {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
    created += result.records.length;
  }

  return Response.json({ created });
}
```

- [ ] **Step 9.2:** Test:

```bash
curl -X POST http://localhost:3000/api/import/apollo \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"recXXX\"}"
```

Expected: `{"created":N}` — N is how many Apollo contacts were imported and tagged to that client.

- [ ] **Step 9.3:** Commit:

```bash
git add app/api/import/apollo/route.js
git commit -m "feat: add POST /api/import/apollo route"
```

---

## Task 10: ClientTabs component

- [ ] **Step 10.1:** Create `components/ClientTabs.jsx`:

```jsx
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
```

- [ ] **Step 10.2:** Commit:

```bash
git add components/ClientTabs.jsx
git commit -m "feat: add ClientTabs component"
```

---

## Task 11: CsvDropzone component

- [ ] **Step 11.1:** Create `components/CsvDropzone.jsx`:

```jsx
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
```

- [ ] **Step 11.2:** Commit:

```bash
git add components/CsvDropzone.jsx
git commit -m "feat: add CsvDropzone component"
```

---

## Task 12: Rewrite LeadPipeline

- [ ] **Step 12.1:** Replace the contents of `components/LeadPipeline.jsx`:

```jsx
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { getStyle, getAction } from '../lib/statusMap';

function StatusPill({ status }) {
  const s = getStyle(status);
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 12px' }}
      className="text-xs font-semibold flex items-center gap-1.5 w-fit">
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
```

- [ ] **Step 12.2:** Commit:

```bash
git add components/LeadPipeline.jsx
git commit -m "feat: rewrite LeadPipeline with real status pills and contextual action buttons"
```

---

## Task 13: Rewrite app/page.jsx

- [ ] **Step 13.1:** Replace the full contents of `app/page.jsx`:

```jsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Users, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';
import ClientTabs from '../components/ClientTabs';
import MetricCard from '../components/MetricCard';
import LeadPipeline from '../components/LeadPipeline';
import CsvDropzone from '../components/CsvDropzone';
import { getGroup } from '../lib/statusMap';

export default function Home() {
  const [clients, setClients]           = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [leads, setLeads]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [syncing, setSyncing]           = useState(false);
  const [lastSync, setLastSync]         = useState(null);
  const [apolloMsg, setApolloMsg]       = useState('');
  const refreshRef = useRef(null);

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => {
        setClients(data);
        if (data.length > 0) setActiveClient(data[0]);
      });
  }, []);

  const fetchLeads = useCallback(async (client) => {
    if (!client) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/leads?clientId=${client.id}`);
      const data = await res.json();
      setLeads(data);
      setLastSync(new Date());
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!activeClient) return;
    setLeads([]);
    setLoading(true);
    fetchLeads(activeClient).finally(() => setLoading(false));
    clearInterval(refreshRef.current);
    refreshRef.current = setInterval(() => fetchLeads(activeClient), 30000);
    return () => clearInterval(refreshRef.current);
  }, [activeClient, fetchLeads]);

  async function handleAction(leadId, nextStatus) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l)));
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
  }

  async function handleApolloImport() {
    if (!activeClient) return;
    setApolloMsg('Importing from Apollo...');
    try {
      const res = await fetch('/api/import/apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: activeClient.id }),
      });
      const data = await res.json();
      setApolloMsg(`${data.created} leads imported`);
      fetchLeads(activeClient);
    } catch {
      setApolloMsg('Apollo import failed');
    }
    setTimeout(() => setApolloMsg(''), 4000);
  }

  const total  = leads.length;
  const active = leads.filter((l) => getGroup(l.status) === 'Active').length;
  const won    = leads.filter((l) => getGroup(l.status) === 'Won').length;

  return (
    <main className="min-h-screen" style={{ background: '#0B1120', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">LeadEngine</h1>
            <p className="text-slate-400 text-sm mt-0.5">Cold lead revenue system</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastSync && (
              <span style={{ color: '#475569', fontSize: 12 }}>
                Synced {lastSync.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => fetchLeads(activeClient)}
              disabled={syncing}
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 16px', color: '#94a3b8', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              Sync Now
            </button>
          </div>
        </div>

        <ClientTabs clients={clients} activeId={activeClient?.id} onSelect={setActiveClient} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <MetricCard label="Total Leads"  value={total}  icon={Users}       color="#F59E0B" />
          <MetricCard label="Active"       value={active} icon={TrendingUp}  color="#60a5fa" />
          <MetricCard label="Closed Won"   value={won}    icon={DollarSign}  color="#22c55e" />
        </div>

        {activeClient && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <CsvDropzone clientId={activeClient.id} onImported={() => fetchLeads(activeClient)} />
            </div>
            <button
              onClick={handleApolloImport}
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 20px', color: '#a78bfa', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Import from Apollo
            </button>
            {apolloMsg && <span style={{ color: '#94a3b8', fontSize: 13 }}>{apolloMsg}</span>}
          </div>
        )}

        {loading
          ? <div style={{ color: '#475569', textAlign: 'center', padding: 48 }}>Loading leads...</div>
          : <LeadPipeline leads={leads} onAction={handleAction} />
        }

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
```

- [ ] **Step 13.2:** Run build:

```bash
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 13.3:** Start dev and visually verify at http://localhost:3000:
  - Client tabs load (one per Airtable client)
  - Clicking a tab loads that client's real leads
  - Status pills show real Airtable status values with correct colors
  - Action buttons advance leads through the pipeline
  - Status change confirmed in Airtable
  - CSV dropzone accepts a file and imports leads
  - Apollo button imports contacts
  - Metrics update per active client

- [ ] **Step 13.4:** Commit:

```bash
git add app/page.jsx
git commit -m "feat: wire page to real Airtable data — tabs, sync, CSV import, Apollo import"
```

---

## Task 14: Cleanup and deploy

- [ ] **Step 14.1:** Delete unused components:

```bash
rm C:\leadengine\components\CommandCenter.jsx
rm C:\leadengine\components\MagneticButton.jsx
```

- [ ] **Step 14.2:** Run build one final time to confirm no broken imports:

```bash
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 14.3:** Push to GitHub (Railway auto-deploys):

```bash
git add -A
git commit -m "chore: remove unused CommandCenter and MagneticButton"
git push origin main
```

- [ ] **Step 14.4:** Watch Railway logs:

```bash
railway logs --lines 40
```

Watch for: `✓ Compiled successfully` then `✓ Ready in Xms`

- [ ] **Step 14.5:** Confirm live URL returns 200:

```bash
curl -s -o /dev/null -w "HTTP %{http_code}" https://lead-engine-dashboard-production.up.railway.app
```

Expected: `HTTP 200`

- [ ] **Step 14.6:** Open the live URL and confirm end-to-end:
  - Tabs load from Airtable
  - Leads appear per client
  - Action button click → Airtable updates → dashboard updates
  - CSV drop → leads appear in pipeline
