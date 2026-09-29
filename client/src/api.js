import { supabase } from './supabaseClient';
// Calls the Node API with the Supabase access token.
export async function api(path, { method = 'GET', body } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(import.meta.env.VITE_API_URL + path, {
    method, body: body && JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

// Loads a GET endpoint: returns [data, reload, error].
import { useCallback, useEffect, useState } from 'react';
export function useApi(path) {
  const [d, setD] = useState(null), [err, setErr] = useState('');
  const load = useCallback(() => api(path).then(setD).catch((e) => setErr(e.message)), [path]);
  useEffect(() => { setD(null); load(); }, [load]);
  return [d, load, err];
}
