// Shared forbidden-pattern definitions used by both:
//   - tools/verify-sanitize.js (runtime sanitize check)
//   - tools/bake-sanitized-snapshots.js (bake-time post-sanitize check)
//
// Any change here applies to both. Keep this file CommonJS so plain Node
// scripts can require() it without the ESM ceremony.

const FORBIDDEN = [
  { label: 'sulliesbakery.com',           re: /sulliesbakery\.com/i },
  { label: 'C:\\Users\\PC',               re: /[A-Za-z]:\\Users\\PC/ },
  { label: '061.umair@gmail.com',         re: /061\.umair@gmail\.com/i },
  { label: 'mailinator.com',              re: /mailinator\.com/i },
  { label: 'asdas@adsfds.com',            re: /asdas@adsfds\.com/i },
  { label: 'cufutob@mailinator.com',      re: /cufutob@mailinator\.com/i },
  { label: "Sullie's Bakery (raw)",       re: /Sullie['']s Bakery/ },
  { label: 'leaked /home/<user>/',        re: /\/home\/[A-Za-z0-9_-]+\// },
];

const FIXTURE_LATIN_TOKENS = [
  'lorem','ipsum','dolor','recusandae','quidem','voluptas','voluptatem',
  'voluptates','provident','necessitatibus','doloribus','veniam','magnam',
  'eligendi','tempora','aliquam','quaerat','numquam','eaque','reprehenderit',
  'consectetur','adipisci','sequi','consequuntur','accusantium','laboriosam',
  'molestias','ratione','similique','tenetur','perspiciatis',
];
const FIXTURE_RE = new RegExp(`\\b(?:${FIXTURE_LATIN_TOKENS.join('|')})\\b`, 'i');

const STRICT_DEMO_SLUGS = new Set([
  'admin-entries-list',
  'admin-entry-detail',
  'admin-payment-detail',
  'admin-payments',
]);

const ADMIN_SLUGS = [
  'admin-addons','admin-entries-overview','admin-entries-list','admin-entry-detail',
  'admin-forms-overview','admin-payments','admin-payment-detail','admin-payments-coupons',
  'admin-settings-access','admin-settings-email','admin-settings-general','admin-settings-geolocation',
  'admin-settings-integrations','admin-settings-misc','admin-settings-payments','admin-settings-validation',
  'admin-templates','admin-tools-action-scheduler','admin-tools-export','admin-tools-import',
  'admin-tools-logs','admin-tools-system',
];

// Run all checks against a string. Returns { hits: [labels], counts: {label: n} }.
// `slug` enables the strict-demo Latin-token check for the four entry/payment
// surfaces.
function checkText(text, slug) {
  const hits = [];
  const counts = {};
  for (const f of FORBIDDEN) {
    const m = text.match(new RegExp(f.re.source, f.re.flags.includes('g') ? f.re.flags : f.re.flags + 'g'));
    if (m) {
      hits.push(f.label);
      counts[f.label] = m.length;
    }
  }
  if (slug && STRICT_DEMO_SLUGS.has(slug)) {
    const m = text.match(FIXTURE_RE);
    if (m) {
      const label = `lorem-style fixture token: "${m[0]}"`;
      hits.push(label);
      counts[label] = 1;
    }
  }
  return { hits, counts };
}

module.exports = { FORBIDDEN, FIXTURE_RE, STRICT_DEMO_SLUGS, ADMIN_SLUGS, checkText };
