#!/usr/bin/env node
// tools/neutralize-payment-iframes.js — blank the `src` of third-party
// payment / hosted-field iframes in a captured snapshot so it loads clean.
//
// Why: a captured published WPForms form ships <iframe>s for Stripe / PayPal /
// Braintree hosted fields. Their `src` is either a real third-party URL or a
// MANGLED, never-saved local path (the capture concatenated the JS-bundle hash
// with the hosted-field template name, e.g.
//   ../_shared/assets/b8eb922983d7.jselements-inner-authentication-<hash>.html
// ). Loading the snapshot then 404s on those files and logs "Blocked script
// execution … frame is sandboxed", which trips smoke-singlehtml.js's
// console/resource-error scan. Payment hosted-field iframes are never
// drivable/needed in a video (the payment area is hidden or editorial), so we
// neutralize their src to about:blank at capture time — the snapshot is born
// clean, no per-symptom stub files needed.
//
// Conservative: only touches an iframe when EITHER
//   (A) its src points at a non-existent file under _shared/assets/, OR
//   (B) its id/name matches a known payment/hosted-field pattern (Stripe,
//       Braintree, PayPal, hCaptcha) AND it has a src to blank.
// It never touches a same-origin iframe whose local src resolves to a real
// file (e.g. the TinyMCE rich-text frame), and it logs every change (no silent
// caps).
//
// Usage: node tools/neutralize-payment-iframes.js --slug <slug>
//        node tools/neutralize-payment-iframes.js <slug>
// Wired into tools/post-capture.js so new captures are born clean.

const path = require('path');
const fs = require('fs');

// id/name patterns for third-party payment + hosted-field + bot-check iframes
const NAME_PATTERNS = [
  /^__privateStripe/i,                 // Stripe: Frame / Controller / MetricsController
  /^braintree-hosted-field/i,          // Braintree hosted card fields
  /^hosted-fields-.*frame/i,           // Braintree tokenization frame
  /paypal-commerce/i,                  // WPForms PayPal Commerce
  /^zoid-paypal-buttons/i,             // PayPal zoid button host (id form)
  /^__zoid__paypal/i,                  // PayPal zoid button host (name form)
  /hcaptcha/i,                         // hCaptcha invisible frame
];

// a src we treat as "external / already inert" — never resolved against disk
function isNonLocal(src) {
  return /^(https?:|about:|data:|blob:|javascript:|#)/i.test(src);
}

function attr(tag, name) {
  const m = tag.match(new RegExp('\\b' + name + '="([^"]*)"'));
  return m ? m[1] : undefined;
}

function main() {
  const argv = process.argv.slice(2);
  let slug = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--slug' && argv[i + 1]) slug = argv[++i];
    else if (!argv[i].startsWith('--')) slug = argv[i];
  }
  if (!slug) {
    console.error('Usage: neutralize-payment-iframes.js --slug <slug>');
    process.exit(1);
  }

  const snapDir = path.join(__dirname, '..', 'snapshots', slug);
  const htmlPath = path.join(snapDir, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error(`Unknown snapshot: ${slug} (${htmlPath})`);
    process.exit(1);
  }

  let html = fs.readFileSync(htmlPath, 'utf8');
  const tags = html.match(/<iframe\b[^>]*>/gi) || [];
  const neutralized = [];

  for (const tag of tags) {
    const src = attr(tag, 'src');
    const name = attr(tag, 'name') || '';
    const id = attr(tag, 'id') || '';
    if (!src || src === 'about:blank') continue; // nothing to blank

    // (A) local src under _shared/assets/ that doesn't resolve to a real file
    let deadLocalAsset = false;
    if (!isNonLocal(src) && /_shared\/assets\//.test(src)) {
      const bare = src.split('#')[0].split('?')[0];
      const resolved = path.resolve(snapDir, bare);
      deadLocalAsset = !fs.existsSync(resolved);
    }

    // (B) known payment / hosted-field / bot-check id or name
    const label = id || name;
    const paymentName = NAME_PATTERNS.some((re) => re.test(id) || re.test(name));

    if (!deadLocalAsset && !paymentName) continue;

    const reason = deadLocalAsset ? 'dead-local-asset' : 'payment-name';
    const newTag = tag.replace(`src="${src}"`, 'src="about:blank"');
    html = html.replace(tag, newTag);
    neutralized.push({ label: label || '(anon)', reason, src: src.split('#')[0].slice(0, 90) });
  }

  if (neutralized.length === 0) {
    console.log(`   neutralize-payment-iframes: ${slug} — no payment/hosted-field iframes to neutralize`);
    return;
  }

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`   neutralize-payment-iframes: ${slug} — blanked ${neutralized.length} iframe src(s):`);
  for (const n of neutralized) {
    console.log(`     • ${n.label}  [${n.reason}]  ${n.src}`);
  }
}

main();
