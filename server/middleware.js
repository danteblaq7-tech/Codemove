import { sb } from './supabase.js';

// Verifies the Supabase access token sent by the React app.
export async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Not signed in' });
  req.user = data.user;
  next();
}
// Wraps async handlers so errors return JSON instead of crashing.
export const h = (fn) => (req, res) => fn(req, res).catch((e) => res.status(500).json({ error: e.message }));
export const byOrder = (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0);

// Role guard: loads the caller's role from the database (never trusts the client).
export const requireRole = (...roles) => async (req, res, next) => {
  const { data } = await sb.from('users').select('role,is_active').eq('id', req.user.id).single();
  if (!data || !data.is_active || !roles.includes(data.role)) return res.status(403).json({ error: 'Not allowed' });
  req.role = data.role;
  next();
};
