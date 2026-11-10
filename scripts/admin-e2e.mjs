// End-to-end check of the admin (#8) against a running server + real DB + fake S3 (CI, MariaDB job).
// Covers the issue's acceptance criteria and the security rules in the project skill:
//   non-images rejected by content · no EXIF/GPS left on R2 · verified ⇄ draft shows/hides publicly
//   2FA · bootstrap code · CSRF header · rate-limited login · editor area scope · disabled account
// Usage: BASE_URL=http://localhost:3100 node scripts/admin-e2e.mjs   (env as in .github/workflows/ci.yml)
import { createHmac } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import sharp from 'sharp';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const S3 = process.env.R2_PUBLIC_URL; // http://127.0.0.1:9000/<bucket>
let step = 0;
const ok = (msg) => console.warn(`  ✓ ${++step}. ${msg}`);
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  process.exit(1);
};
const expect = (cond, msg) => (cond ? ok(msg) : fail(msg));

// ── tiny cookie-aware client ────────────────────────────────────────────────
function client() {
  const jar = new Map();
  const c = async (path, { method = 'GET', json, form, header = true } = {}) => {
    const headers = {};
    if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    if (header && method !== 'GET') headers['x-eiv-admin'] = '1';
    if (json !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(BASE + path, { method, headers, body: form ?? (json !== undefined ? JSON.stringify(json) : undefined), redirect: 'manual' });
    for (const sc of res.headers.getSetCookie()) {
      const [pair, ...attrs] = sc.split(';');
      const [k, v] = pair.split('=');
      if (attrs.some((a) => /max-age=0|expires=thu, 01 jan 1970/i.test(a.trim())) || v === '') jar.delete(k.trim());
      else jar.set(k.trim(), v);
    }
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, body, location: res.headers.get('location') };
  };
  c.jar = jar;
  return c;
}

// ── TOTP (RFC 6238), independent of the app's implementation ────────────────
function totp(secret, t = Date.now()) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of secret.replace(/\s/g, '')) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(t / 30000)));
  const mac = createHmac('sha1', key).update(msg).digest();
  const o = mac[19] & 15;
  return String((mac.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, '0');
}

async function enrol2fa(c, label) {
  const s = await c('/api/admin/auth/2fa/setup', { method: 'POST', json: {} });
  expect(s.status === 200 && /^[A-Z2-7]{32}$/.test(s.body.secret) && s.body.uri.startsWith('otpauth://totp/'), `${label}: 2FA enrolment returns a secret`);
  const bad = await c('/api/admin/auth/2fa', { method: 'POST', json: { code: '000000' } });
  expect(bad.status === 400, `${label}: wrong 2FA code rejected`);
  const r = await c('/api/admin/auth/2fa', { method: 'POST', json: { code: totp(s.body.secret) } });
  expect(r.status === 200 && r.body.next === '/admin', `${label}: valid 2FA code completes login`);
  return s.body.secret;
}

const page = async (path) => {
  const r = await fetch(BASE + path, { redirect: 'manual' });
  return { status: r.status, html: await r.text() };
};

/** ISR pages may need one more request after revalidatePath: retry a few times before failing. */
async function eventually(path, test) {
  let last;
  for (let i = 0; i < 6; i++) {
    last = await page(path);
    if (test(last)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error(`    last response for ${path}: ${last.status}`);
  return false;
}

async function jpegWithGps() {
  const buf = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#c8452c' } })
    .jpeg({ quality: 80 })
    .withExif({
      IFD0: { Make: 'CI-Camera', Model: 'Leaky', Copyright: 'secret-owner' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '10/1 46/1 3720/100', GPSLongitudeRef: 'E', GPSLongitude: '106/1 41/1 5400/100' },
    })
    .toBuffer();
  const meta = await sharp(buf).metadata();
  if (!meta.exif || !meta.exif.includes('Leaky')) fail('test image did not get its EXIF');
  return buf;
}

async function main() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);
  const q = async (sql, args = []) => (await db.query(sql, args))[0];
  console.warn('Admin e2e');

  // ── bootstrap + 2FA ───────────────────────────────────────────────────────
  const anon = client();
  const gate = await anon('/admin');
  expect([307, 308].includes(gate.status) && gate.location?.includes('/admin/dang-nhap'), '/admin redirects anonymous visitors to login');
  expect((await anon('/api/admin/restaurants', { method: 'POST', json: {} })).status === 401, 'admin API refuses anonymous calls');

  const admin = client();
  const email = process.env.ADMIN_BOOTSTRAP_EMAILS.split(',')[0];
  const setupBody = { email, displayName: 'CI Admin', password: 'mot-cum-tu-rat-dai-2026', code: process.env.ADMIN_SETUP_CODE };
  expect((await admin('/api/admin/auth/setup', { method: 'POST', json: setupBody, header: false })).status === 403, 'mutations without the x-eiv-admin header are refused (CSRF)');
  expect((await admin('/api/admin/auth/setup', { method: 'POST', json: { ...setupBody, code: 'wrong-code-123' } })).status === 401, 'bootstrap with a wrong code is refused');
  expect((await admin('/api/admin/auth/setup', { method: 'POST', json: { ...setupBody, email: 'not-listed@ci.test' } })).status === 403, 'bootstrap for an unlisted email is refused');
  const setup = await admin('/api/admin/auth/setup', { method: 'POST', json: setupBody });
  expect(setup.status === 200 && setup.body.next === '/admin/2fa', 'first admin is created and sent to 2FA (REQUIRE_ADMIN_2FA on)');
  expect((await admin('/api/admin/restaurants', { method: 'POST', json: {} })).body?.error?.code === 'two_factor_required', 'admin API waits for 2FA');
  const adminSecret = await enrol2fa(admin, 'admin');
  expect((await client()('/api/admin/auth/setup', { method: 'POST', json: setupBody })).status === 409, 'bootstrap works only once per email');

  const [{ hash }] = await q('SELECT password_hash AS hash FROM users WHERE email = ?', [email]);
  expect(hash.startsWith('scrypt$') && !hash.includes(setupBody.password), 'password stored as a scrypt hash');
  const [{ enc }] = await q('SELECT totp_secret_enc AS enc FROM users WHERE email = ?', [email]);
  expect(enc.startsWith('v1.') && !enc.includes(adminSecret), 'TOTP secret encrypted at rest');

  // Login again from a fresh client (password + code).
  const admin2 = client();
  const login = await admin2('/api/admin/auth/login', { method: 'POST', json: { email, password: setupBody.password } });
  expect(login.status === 200 && login.body.next === '/admin/2fa', 'login with 2FA enabled asks for the code');
  const code = await admin2('/api/admin/auth/2fa', { method: 'POST', json: { code: totp(adminSecret) } });
  expect(code.status === 200, 'login completes with the authenticator code');

  // ── restaurant lifecycle ─────────────────────────────────────────────────
  const input = {
    name: 'Bún riêu CI Cô Tư',
    venueType: 'Quán vỉa hè',
    address: '99 Đường Thử Nghiệm, Phường Xuân Hòa',
    lat: 10.7801,
    lng: 106.6889,
    district: 'quan-3',
    ward: 'Phường Xuân Hòa',
    priceMin: 30000,
    priceMax: 45000,
    highlight: 'Riêu cua đồng giã tay',
    dishes: ['bun-bo', 'mon-chay'],
    primaryDish: 'bun-bo',
    vibes: [
      { slug: 'healthy', checked: [true, true, true] },
      { slug: 'hen-ho', checked: [true, false, false] },
    ],
    hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '06:00', close: '13:00' })),
    menu: [{ group: 'Bún', name: 'Bún riêu ốc', price: 45000, mustTry: true }],
    features: ['Nước dùng thanh'],
  };
  const bad = await admin('/api/admin/restaurants', { method: 'POST', json: { ...input, lat: 48.85, lng: 2.35 } });
  expect(bad.status === 400 && /Việt Nam/.test(bad.body.error.message), 'invalid input → 400 with a Vietnamese message');
  const created = await admin('/api/admin/restaurants', { method: 'POST', json: input });
  expect(created.status === 201 && created.body.slug === 'bun-rieu-ci-co-tu', `created draft ${created.body.slug}`);
  const { id, slug } = created.body;
  expect(await eventually(`/quan/${slug}`, (r) => r.status === 404), 'a draft is not public');
  const [rest] = await q("SELECT status, source, search_text AS st FROM restaurants WHERE id = ?", [id]);
  expect(rest.status === 'draft' && rest.st.includes(' bun rieu ') && rest.st.includes(' quan 3 '), 'saved as draft with search_text');
  const vibes = await q("SELECT t.slug FROM restaurant_tags rt JOIN tags t ON t.id = rt.tag_id WHERE rt.restaurant_id = ? AND t.kind = 'vibe'", [id]);
  expect(vibes.length === 1 && vibes[0].slug === 'healthy', 'a vibe tag needs all 3 criteria (healthy yes, hẹn hò no)');
  const [ward] = await q("SELECT kind FROM areas WHERE slug = 'phuong-xuan-hoa'");
  expect(ward?.kind === 'ward', 'new ward created on first use');

  // Photos
  const fake = new FormData();
  fake.set('file', new Blob([Buffer.from('this is not an image, just text pretending')], { type: 'image/jpeg' }), 'photo.jpg');
  fake.set('alt', 'Ảnh giả');
  const rejected = await admin(`/api/admin/restaurants/${id}/photos`, { method: 'POST', form: fake });
  expect(rejected.status === 400 && rejected.body.error.code === 'not_an_image', 'a non-image with an image Content-Type is rejected');

  const jpeg = await jpegWithGps();
  const up = new FormData();
  up.set('file', new Blob([jpeg], { type: 'image/jpeg' }), 'IMG_0001.jpg');
  up.set('alt', 'Tô bún riêu với rau sống');
  const uploaded = await admin(`/api/admin/restaurants/${id}/photos`, { method: 'POST', form: up });
  expect(uploaded.status === 201, 'photo uploaded');
  const [photo] = await q('SELECT r2_key AS k, width, height FROM photos WHERE id = ?', [uploaded.body.id]);
  expect(/^restaurants\/\d+\/[0-9a-f-]{36}-1440\.webp$/.test(photo.k) && photo.width === 1440 && photo.height === 1080, `stored ${photo.k} (${photo.width}×${photo.height})`);
  for (const w of [480, 960, 1440]) {
    const r = await fetch(`${S3}/${photo.k.replace('-1440.', `-${w}.`)}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const m = await sharp(buf).metadata();
    expect(r.ok && m.format === 'webp' && m.width === w && !m.exif && !buf.includes('Leaky') && !buf.includes('secret-owner'), `R2 ${w}px is WebP with no EXIF/GPS left`);
  }

  // Publish
  const incomplete = await admin('/api/admin/restaurants', { method: 'POST', json: { ...input, name: 'Quán CI thiếu giờ', hours: [], dishes: [], primaryDish: null, vibes: [] } });
  const noVerify = await admin(`/api/admin/restaurants/${incomplete.body.id}/status`, { method: 'POST', json: { action: 'verify', method: 'phone' } });
  expect(noVerify.status === 400 && noVerify.body.error.code === 'incomplete', 'cannot verify a restaurant without dishes/hours');
  const v = await admin(`/api/admin/restaurants/${id}/status`, { method: 'POST', json: { action: 'verify', method: 'visited' } });
  expect(v.status === 200 && v.body.status === 'verified', 'verified');
  expect(await eventually(`/quan/${slug}`, (r) => r.status === 200 && r.html.includes(input.name)), 'verified restaurant is public');
  expect((await page(`/quan/${slug}`)).html.includes(`${S3}/restaurants/${id}/`), 'its page uses the R2 photo');
  expect(await eventually('/mon/bun-bo', (r) => r.html.includes(input.name)), 'listed on its dish page');
  expect((await page(`/tim-kiem?q=${encodeURIComponent('bún riêu')}`)).html.includes(`/quan/${slug}`), 'found by search');
  const [vr] = await q('SELECT verification_method AS m, verified_by AS by_, DATEDIFF(reverify_due_at, verified_at) AS days FROM restaurants WHERE id = ?', [id]);
  expect(vr.m === 'visited' && vr.by_ && vr.days === 90, 'verification method, verifier and 90-day deadline recorded');

  // Edit after publish: slug frozen, page revalidated immediately (ISR).
  const edited = await admin(`/api/admin/restaurants/${id}`, { method: 'PUT', json: { ...input, name: 'Bún riêu CI Cô Tư (đổi tên)', slug: 'doi-slug' } });
  expect(edited.status === 200 && edited.body.slug === slug, 'slug is frozen once published');
  expect(await eventually(`/quan/${slug}`, (r) => r.html.includes('(đổi tên)')), 'public page shows the edit (revalidatePath)');

  // Unpublish
  await admin(`/api/admin/restaurants/${id}/status`, { method: 'POST', json: { action: 'draft' } });
  expect(await eventually(`/quan/${slug}`, (r) => r.status === 404), 'back to draft → no longer public');
  expect(await eventually('/mon/bun-bo', (r) => r.status === 200 && !r.html.includes('(đổi tên)')), 'and gone from its dish page');

  // Delete photo → objects gone
  const del = await admin(`/api/admin/photos/${uploaded.body.id}`, { method: 'DELETE', json: {} });
  const gone = await Promise.all([480, 960, 1440].map((w) => fetch(`${S3}/${photo.k.replace('-1440.', `-${w}.`)}`, { method: 'HEAD' })));
  if (del.status !== 200 || !gone.every((r) => r.status === 404)) console.error('    delete:', del.status, JSON.stringify(del.body), gone.map((r) => r.status));
  expect(del.status === 200 && gone.every((r) => r.status === 404), 'deleting a photo removes every R2 size');

  // ── editors, scope, disable ───────────────────────────────────────────────
  const inv = await admin('/api/admin/users', { method: 'POST', json: { email: 'bientap.q1@ci.test', displayName: 'Biên tập Q1', role: 'editor', areas: ['quan-1'] } });
  expect(inv.status === 201 && inv.body.link.includes('/admin/kich-hoat?token=') && inv.body.mailed === false, 'invite returns a one-time link (no SMTP in CI)');
  const token = new URL(inv.body.link).searchParams.get('token');
  const editor = client();
  const act = await editor('/api/admin/auth/activate', { method: 'POST', json: { token, displayName: 'Biên tập Q1', password: 'bien-tap-quan-mot-2026' } });
  expect(act.status === 200 && act.body.next === '/admin/2fa', 'editor sets a password from the link');
  expect((await client()('/api/admin/auth/activate', { method: 'POST', json: { token, displayName: 'X', password: 'mat-khau-khac-2026' } })).status === 400, 'the link works only once');
  await enrol2fa(editor, 'editor');
  const outOfScope = await editor(`/api/admin/restaurants/${id}`, { method: 'PUT', json: input });
  expect(outOfScope.status === 403 && outOfScope.body.error.code === 'out_of_scope', 'editor cannot edit a restaurant outside their areas');
  expect((await editor('/api/admin/restaurants', { method: 'POST', json: input })).status === 403, 'editor cannot create a restaurant outside their areas');
  const inScope = await editor('/api/admin/restaurants', { method: 'POST', json: { ...input, name: 'Quán CI Quận 1', district: 'quan-1', ward: null } });
  expect(inScope.status === 201, 'editor can create inside their area');
  expect((await editor('/api/admin/users', { method: 'POST', json: { email: 'x@ci.test', displayName: 'X', role: 'admin' } })).status === 403, 'editor cannot manage users');
  const [{ eid }] = await q("SELECT id AS eid FROM users WHERE email = 'bientap.q1@ci.test'");
  expect((await admin(`/api/admin/users/${eid}`, { method: 'PATCH', json: { status: 'disabled' } })).status === 200, 'admin disables the editor');
  expect((await editor('/api/admin/restaurants', { method: 'POST', json: input })).status === 401, 'a disabled account is logged out immediately');
  const self = await admin(`/api/admin/users/${(await q('SELECT id FROM users WHERE email = ?', [email]))[0].id}`, { method: 'PATCH', json: { status: 'disabled' } });
  expect(self.status === 400, 'an admin cannot lock themselves out');

  // ── login rate limit + audit ─────────────────────────────────────────────
  const brute = client();
  let last = 0;
  for (let i = 0; i < 6; i++) last = (await brute('/api/admin/auth/login', { method: 'POST', json: { email, password: `wrong-${i}` } })).status;
  expect(last === 429, 'repeated wrong passwords are rate-limited');
  const [{ n }] = await q("SELECT COUNT(*) AS n FROM audit_log WHERE entity = 'restaurant' AND entity_id = ? AND user_id IS NOT NULL", [id]);
  expect(Number(n) >= 6, `audit log has ${n} entries for the restaurant, each with a person`);
  const hist = await admin(`/admin/quan/${id}`);
  expect(hist.status === 200 && hist.body.includes('CI Admin') && hist.body.includes('xác minh'), 'edit page shows who did what');

  // ── reminders (decision A) ───────────────────────────────────────────────
  const cron = await fetch(`${BASE}/api/cron/reverify?force=1`, { headers: { 'x-cron-secret': process.env.CRON_SECRET } }).then((r) => r.json());
  expect(cron.count >= 1 && cron.reminders.recipients >= 1 && cron.reminders.skipped === 'no_smtp', `reminders: ${cron.reminders.recipients} recipient(s), ${cron.reminders.restaurants} restaurant(s), mail skipped without SMTP`);

  // Session for the screenshot script.
  await writeFile('admin-session.json', JSON.stringify({ cookies: [...admin.jar].map(([name, value]) => ({ name, value })), restaurantId: id }));
  await db.end();
  console.warn(`OK: ${step} admin checks passed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
