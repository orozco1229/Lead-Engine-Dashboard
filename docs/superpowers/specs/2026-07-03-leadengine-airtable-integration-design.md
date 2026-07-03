# LeadEngine Dashboard — Airtable Integration Design
**Date:** 2026-07-03  
**Status:** Approved

## What We're Building

Wire the LeadEngine Dashboard to Airtable so lead data is real, persistent, and organized per client. The dashboard gets client tabs (one per row in the Clients table), CSV drop-import per tab, Apollo import per tab, full two-way status sync, and a 30-second auto-refresh. Nothing touches Airtable from the browser — all reads and writes go through Next.js API routes on the same Railway service.

---

## Airtable Schema Change

**One field added to the Leads table:**

| Field | Type | Purpose |
|-------|------|---------|
| Client | Linked record → Clients table | Tags every lead to exactly one client |

All existing fields (Name, Status, Phone, Email, Brokerage, Source, City, etc.) stay as-is. This single field is what makes per-client tabs possible.

---

## Architecture

```
Browser (React)
  └── calls → Next.js API routes (/api/*)
                └── calls → Airtable REST API
                └── calls → Apollo API
```

The Airtable token and Apollo key live in Railway environment variables — never in the browser.

---

## API Routes

| Route | Method | What it does |
|-------|--------|-------------|
| `/api/clients` | GET | Fetch all rows from Clients table → powers the tab list |
| `/api/leads` | GET `?clientId=recXXX` | Fetch leads filtered by Client linked field |
| `/api/leads/[id]` | PATCH | Update a single lead's Status in Airtable |
| `/api/import/csv` | POST | Parse CSV, create Airtable records tagged to a client |
| `/api/import/apollo` | POST | Pull contacts from Apollo, create Airtable records tagged to a client |

---

## Frontend Changes

### Client Tabs
- On mount: `GET /api/clients` → render one tab per client (name from Clients table)
- Active tab drives all data shown below it
- Switching tabs re-fetches leads for that client

### Lead Pipeline (per tab)
- On tab load: `GET /api/leads?clientId=recXXX`
- Auto-refresh every 30 seconds (same call, updates in place)
- "Resolve" button → `PATCH /api/leads/[id]` with `Status: Enriched` → optimistic UI update, confirmed on next refresh
- "Fail" button → `PATCH /api/leads/[id]` with `Status: Failed`

### CSV Dropzone (per tab)
- Drag-and-drop area visible on each client tab
- Accepts `.csv` files
- Column mapping (case-insensitive, extras ignored):

| CSV Column | Airtable Field |
|-----------|---------------|
| Name / Full Name | Name |
| Email | Email |
| Phone / Phone Number | Phone |
| Company / Brokerage / Business | Brokerage |
| Source | Source |
| City | City |
| Notes | Notes |

- On drop → `POST /api/import/csv` with `{ clientId, rows[] }` → creates Airtable records with Client field pre-tagged → pipeline refreshes
- Shows a progress count: "Importing 47 leads…" → "47 leads added"

### Apollo Import Button (per tab)
- Button: "Import from Apollo"
- On click → `POST /api/import/apollo` with `{ clientId }` → pulls contacts from Apollo account → creates Airtable records tagged to client
- Uses existing Apollo API key
- Shows count of leads imported

### Metrics (per tab)
- Total, Enriched, Failed counts scoped to the active client's leads
- Revenue Unlocked stays as-is (enriched leads × estimated value)

---

## Status Mapping

Your Airtable Status field has 8 values. The dashboard collapses these into 4 visual states with distinct colors:

| Airtable value | Dashboard pill | Color |
|---------------|---------------|-------|
| New | Pending | Gray |
| Attempted | Pending | Gray |
| Contacted | Active | Blue |
| Responded | Active | Blue |
| Proposal Sent | Active | Purple |
| Closed-Won | Won | Green |
| Not Interested | Lost | Red |
| Do Not Contact | Lost | Red |

The action buttons on the pipeline table change based on state:
- **Pending** leads → "Mark Attempted" button
- **Active** leads → "Send Proposal" button  
- **Won / Lost** leads → no action button (final state)

All button clicks write the exact Airtable status value back (e.g. "Attempted", "Proposal Sent"), preserving your full Airtable history. The dashboard just groups them visually.

---

## Environment Variables (Railway)

| Variable | Value |
|---------|-------|
| `AIRTABLE_API_KEY` | Personal access token from airtable.com/account |
| `AIRTABLE_BASE_ID` | `app42YJq8Esmt8YLh` |
| `APOLLO_API_KEY` | From Apollo account settings |

---

## Data Flow Summary

```
App loads
  → GET /api/clients → tabs render

User clicks tab
  → GET /api/leads?clientId=recXXX → pipeline populates
  → setInterval(30s) → same call, keeps data fresh

User drops CSV
  → POST /api/import/csv { clientId, rows } → records created in Airtable → refresh

User clicks Apollo Import
  → POST /api/import/apollo { clientId } → Apollo contacts → Airtable records → refresh

User clicks Resolve
  → PATCH /api/leads/[id] { status: "Enriched" } → Airtable updated → UI updates immediately
```

---

## Out of Scope

- Authentication (no login required yet)
- Lead deduplication on CSV import (add later)
- Webhook-based real-time updates (polling covers this for now)
- Google Maps / Yelp scraping (future source)
