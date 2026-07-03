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
