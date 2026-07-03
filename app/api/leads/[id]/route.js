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
