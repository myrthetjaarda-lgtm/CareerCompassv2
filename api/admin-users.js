import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = 'https://xfwgipqxcrotcsttpuka.supabase.co';

  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });

  // Verify request comes from admin (check Authorization header with user's JWT)
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  // Verify the JWT using anon client first
  const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || 'sb_publishable_v0Jo9c2TWxjon6N_GIZfZg_ZiZcGgT2');
  const { data: { user }, error } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user || user.email !== 'myrthetjaarda@gmail.com') {
    return res.status(403).json({ error: 'Admin access only' });
  }

  // Use service role client to read all users
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) return res.status(500).json({ error: profilesError.message });

  const { data: userData } = await adminClient
    .from('user_data')
    .select('user_id, data');

  const users = (profiles || []).map(p => {
    const ud = (userData || []).find(u => u.user_id === p.id);
    const d = ud?.data || {};
    return {
      id: p.id,
      email: p.email,
      name: p.name,
      isPro: p.is_pro,
      isAdmin: p.is_admin,
      createdAt: p.created_at,
      applications: d.applications?.length || 0,
      references: d.references?.length || 0,
      offers: d.offers?.length || 0,
      hasProfile: !!(d.profile?.name),
    };
  });

  return res.status(200).json({ users });
}
