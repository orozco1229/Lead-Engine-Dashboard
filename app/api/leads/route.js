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
