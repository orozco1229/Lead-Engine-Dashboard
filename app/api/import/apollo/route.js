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
