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
