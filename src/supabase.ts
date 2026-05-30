import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xfwgipqxcrotcsttpuka.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_v0Jo9c2TWxjon6N_GIZfZg_ZiZcGgT2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function loadUserData() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase.from('user_data').select('data').eq('user_id', user.id).single();
  return data?.data || null;
}

export async function saveUserData(appData: unknown) {
  const user = await getUser();
  if (!user) return;
  await supabase.from('user_data').upsert({ user_id: user.id, data: appData, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

export async function loadProfile() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}
