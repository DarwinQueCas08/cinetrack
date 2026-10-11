// Run only on a trusted administrator machine. Never import into the frontend.
import { createHash, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const username = process.argv[2]?.trim().toLowerCase();
const issue = process.argv.includes('--issue-code');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function request(path, options = {}) {
  const response = await fetch(`${url.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) throw new Error(`Supabase respondió HTTP ${response.status}.`);
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

try {
  if (!username || !url || !key) throw new Error('Uso: node scripts/account-recovery.mjs USUARIO [--issue-code]. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  if (!url.startsWith('https://')) throw new Error('SUPABASE_URL debe usar HTTPS.');
  let user;
  for (let page = 1; ; page++) {
    const result = await request(`/auth/v1/admin/users?page=${page}&per_page=100`);
    user = result.users.find(entry => entry.email?.toLowerCase() === `${username}@cinetrack.local`);
    if (user || result.users.length < 100) break;
  }
  if (!user) throw new Error('No se encontró ese usuario.');
  console.log(`Usuario: ${username}\nID: ${user.id}`);
  if (issue) {
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    let confirmation;
    try {
      confirmation = await terminal.question('Verifica la identidad de la persona por un canal de confianza. Escribe su usuario para generar un código (reemplaza el anterior): ');
    } finally { terminal.close(); }
    if (confirmation.trim().toLowerCase() !== username) throw new Error('Operación cancelada.');
    const raw = randomBytes(32).toString('hex');
    await request('/rest/v1/kv_store_da14cc3d?on_conflict=key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: `auth:recovery:${username}`, value: { userId: user.id, hash: createHash('sha256').update(raw).digest('hex') } }),
    });
    console.log(`Código privado de un solo uso: ${raw.match(/.{8}/g).join('-')}\nEntrégalo solo al titular. Puede usarlo en «¿Olvidaste tu contraseña?».`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
