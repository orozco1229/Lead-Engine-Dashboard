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
