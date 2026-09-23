// Shared sanitize helpers. Applied to snapshot iframe docs before playback /
// inspection so customer data never leaks through.
//
// Dummy defaults:
//   Domain:    sulliesbakery.com   (legacy public brand — used by rebrandDomain
//                                    when source captures referenced newsite.local)
//   Admin URL: http://video-test-site.local/wp-admin/
//   Email:     sullie@wpforms.com
//   Form:      "Contact Us form"
//   Forms list: Contact Us form / Newsletter Signup / Job Application
//
// New captures come from sulliesbakery.com — see rebrandLiveDomain() below
// for scrubbing that source.

export const DUMMY = {
  domain: 'sulliesbakery.com',
  adminHost: 'video-test-site.local',
  email: 'sullie@wpforms.com',
  formTitle: 'Contact Us form',
  formsList: ['Contact Us form', 'Newsletter Signup', 'Job Application'],
  // Sample submitter rows for entries-list / entry-detail scrubbing.
  // Five contextual WPForms demo rows (no PII, no mailinator, no lorem).
  sampleEntries: [
    { name: 'Sarah Mitchell', email: 'sarah@example.com',  message: 'I would like more information about your catering options.' },
    { name: 'Daniel Cooper',  email: 'daniel@example.com', message: 'Please send me details about weekend availability.' },
    { name: 'Priya Shah',     email: 'priya@example.com',  message: 'I have a question about customizing my order.' },
    { name: 'Marcus Lee',     email: 'marcus@example.com', message: 'Can someone follow up with pricing information?' },
    { name: 'Emily Carter',   email: 'emily@example.com',  message: 'I am interested in placing a large order next month.' },
  ],
  // Single payment-detail demo (Sarah, with payment-field breakdown).
  samplePayment: {
    name: 'Sarah Mitchell',
    email: 'sarah@example.com',
    message: 'Please include plates and napkins with my order.',
    paymentSingle: '$25.00',
    paymentCheckbox: ['Cupcakes - $40.00', 'Cookies - $35.00', 'Delivery - $15.00'],
    paymentMultiple: ['Cupcakes - $40.00'],
    paymentSelect:   ['Standard Delivery - $15.00'],
    stripe: ['xxxx xxxx xxxx 4242', 'Visa'],
  },
};

const EMAIL_RE   = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const NEWSITE_RE = /newsite\.local/g;

export function walkText(doc, fn) {
  const walker = doc.createTreeWalker(doc.body || doc, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const v = n.nodeValue;
    if (!v) continue;
    const out = fn(v);
    if (out !== v) n.nodeValue = out;
  }
}

// Replace newsite.local everywhere — href/src/text/input value.
export function rebrandDomain(doc) {
  doc.querySelectorAll('*').forEach(el => {
    for (const a of el.attributes || []) {
      if (NEWSITE_RE.test(a.value)) {
        el.setAttribute(a.name, a.value.replace(NEWSITE_RE, DUMMY.adminHost));
      }
    }
    if ('value' in el && typeof el.value === 'string' && NEWSITE_RE.test(el.value)) {
      el.value = el.value.replace(NEWSITE_RE, DUMMY.adminHost);
    }
  });
  walkText(doc, v => v.replace(NEWSITE_RE, DUMMY.domain));
}

// Replace the live source domain (default sulliesbakery.com) everywhere —
// attributes, body text, and the document <title> — with DUMMY.adminHost.
// Also scrubs the matching brand string (default "Sullie's Bakery") in the
// title, since `walkText` only walks the body. Both variants of apostrophe
// (ASCII and curly U+2019) are handled.
export function rebrandLiveDomain(doc, sourceDomain = 'sulliesbakery.com', brandName = "Sullie's Bakery") {
  const esc = sourceDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx  = new RegExp(esc, 'g');
  doc.querySelectorAll('*').forEach(el => {
    for (const a of el.attributes || []) {
      if (rx.test(a.value)) {
        el.setAttribute(a.name, a.value.replace(rx, DUMMY.adminHost));
      }
    }
    if ('value' in el && typeof el.value === 'string' && rx.test(el.value)) {
      el.value = el.value.replace(rx, DUMMY.adminHost);
    }
  });
  walkText(doc, v => v.replace(rx, DUMMY.adminHost));
  // Document title lives in <head> and isn't reached by walkText.
  if (typeof doc.title === 'string') {
    let t = doc.title.replace(rx, DUMMY.adminHost);
    t = t.replace(/Sullie['’]s Bakery/g, 'Demo Site');
    if (brandName && brandName !== "Sullie's Bakery") {
      const bEsc = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      t = t.replace(new RegExp(bEsc, 'g'), 'Demo Site');
    }
    if (t !== doc.title) doc.title = t;
  }
}

// Swap every visible email to the dummy.
export function stripEmailTraces(doc) {
  walkText(doc, v => v.replace(EMAIL_RE, DUMMY.email));
  doc.querySelectorAll('input, textarea').forEach(el => {
    if (typeof el.value === 'string' && EMAIL_RE.test(el.value)) {
      el.value = el.value.replace(EMAIL_RE, DUMMY.email);
    }
  });
  // mailto:... href
  doc.querySelectorAll('a[href^="mailto:"]').forEach(a => {
    a.setAttribute('href', 'mailto:' + DUMMY.email);
  });
}

// Reset "12,438 entries" → "0" in the admin forms list.
export function stripEntryCounts(doc) {
  doc.querySelectorAll('td.column-entries a, .column-entries a').forEach(a => {
    a.textContent = '0';
  });
  doc.querySelectorAll('.wpforms-dash-widget-entries-count, .wpforms-entries-count').forEach(el => {
    el.textContent = '0';
  });
}

// Promote the teaser's inline renamer — swap any strong/title text matching
// `from` (string or RegExp) to `to` across the doc.
export function renameForm(doc, to = DUMMY.formTitle, from = /Master Form/g) {
  const rx = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  walkText(doc, v => rx.test(v) ? v.replace(rx, to) : v);
  doc.querySelectorAll('input, textarea').forEach(el => {
    if (typeof el.value === 'string' && rx.test(el.value)) {
      el.value = el.value.replace(rx, to);
    }
  });
  doc.querySelectorAll('[title]').forEach(el => {
    const t = el.getAttribute('title');
    if (t && rx.test(t)) el.setAttribute('title', t.replace(rx, to));
  });
}

// Seed admin form list with 3 rows: Contact Us form / Newsletter Signup / Job Application.
// Keeps the first 3 real rows (for structure), rewrites their name cell text.
export function dummyFormsList(doc, names = DUMMY.formsList) {
  const rows = doc.querySelectorAll('tbody#the-list > tr:not(.wpforms-bulk-edit-tags)');
  if (!rows.length) return;
  const keep = Math.min(rows.length, names.length);
  rows.forEach((row, i) => {
    if (i >= keep) { row.remove(); return; }
    const strong = row.querySelector('.column-name strong, .column-name a strong');
    if (strong) strong.textContent = names[i];
  });
}

// Keep only the listed field types in the builder preview. Pattern lifted from teaser.
export function setFieldTypes(doc, types) {
  const want = new Set(types);
  const wrap = doc.querySelector('#wpforms-panel-fields .wpforms-field-wrap')
            || doc.querySelector('.wpforms-field-wrap');
  if (!wrap) return;
  Array.from(wrap.children).forEach(child => {
    const t = child.getAttribute && child.getAttribute('data-field-type');
    if (!t || !want.has(t)) child.remove();
  });
  doc.querySelectorAll(
    '.wpforms-field-submit, .wpforms-field-submit-container, ' +
    '.wpforms-preview-submit, #wpforms-preview-submit, ' +
    '.wpforms-field-paypal-commerce, .wpforms-field-stripe-credit-card'
  ).forEach(el => el.remove());
}

// Replace OS file paths leaked in System Info-style screens.
// Targets: `C:\Users\<name>\...`, `D:\Users\<name>\...`, `/home/<name>/...`,
// `/Users/<name>/...`. Replaced with a stable POSIX placeholder so screenshots
// look like a typical Linux WP host.
export function redactLocalPaths(doc) {
  const winRe   = /[A-Za-z]:\\Users\\[^\s<>"'\\]+\\?(?:[^\s<>"']*\\)*/g;
  const homeRe  = /\/home\/[A-Za-z0-9_-]+\//g;
  const usersRe = /\/Users\/[A-Za-z0-9_-]+\//g;
  walkText(doc, v => v
    .replace(winRe,   '/var/www/html/')
    .replace(homeRe,  '/var/www/html/')
    .replace(usersRe, '/var/www/html/'));
}

// Replace real-looking IPv4 strings with 127.0.0.1 in text. Strict octet bounds
// (0–255) so version strings like "1.10.0.4" or "2.937.844.813" are not touched
// (the second has out-of-range octets; the first is intentionally left alone —
// edit-distance from real traffic is small but the string also appears as a
// plugin version on many pages, so blanket-replace would over-redact).
// Real-world entry IPs and log IPs land here.
const IP_OCTET = /(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)/;
const IP_RE = new RegExp(`(?<![\\d.])${IP_OCTET.source}\\.${IP_OCTET.source}\\.${IP_OCTET.source}\\.${IP_OCTET.source}(?![\\d.])`, 'g');
const IP_KEEP = new Set(['127.0.0.1', '0.0.0.0', '255.255.255.255']);
export function redactIPs(doc) {
  walkText(doc, v => v.replace(IP_RE, m => IP_KEEP.has(m) ? m : '127.0.0.1'));
  // Also catch the WP entry-meta `User IP: <strong>X</strong>` block.
  doc.querySelectorAll('.wpforms-entry-meta strong, .entry-ip').forEach(el => {
    if (el.textContent && IP_RE.test(el.textContent)) {
      el.textContent = el.textContent.replace(IP_RE, m => IP_KEEP.has(m) ? m : '127.0.0.1');
    }
  });
}

// admin-settings-payments — replace the connected-Stripe banner text without
// dropping the surrounding <em>/<strong> nodes (those drive WPForms styling).
export function dummyStripeConnection(doc, accountName = 'Demo Account', mode = 'Test Mode') {
  doc.querySelectorAll('.wpforms-stripe-connection-status .wpforms-connected p, .wpforms-stripe-connect-account-info p').forEach(p => {
    const em = p.querySelector('em');
    const strong = p.querySelector('strong');
    if (em) em.textContent = accountName;
    if (strong) strong.textContent = mode;
  });
}

// admin-settings-integrations — rewrite each connected-account row label/date.
// Targets WPForms `.wpforms-settings-provider-accounts-list li` items.
export function dummyProviderAccounts(doc, label = 'demo@example.com', dateText = 'Connected on: January 1, 2026') {
  doc.querySelectorAll('.wpforms-settings-provider-accounts-list li').forEach(li => {
    const labelEl = li.querySelector('.label');
    const dateEl  = li.querySelector('.date');
    if (labelEl) labelEl.textContent = label;
    if (dateEl)  dateEl.textContent  = dateText;
  });
}

// admin-entries-list — sweep submitter cells with rotating contextual demo
// data. Targets data-field-type cells inside `tbody#the-list > tr`.
// Recognized types: name, email, text, textarea (paragraph). Other types are
// left untouched so structural cells (date/actions) still render.
export function dummyEntriesList(doc, samples = DUMMY.sampleEntries) {
  const rows = doc.querySelectorAll('tbody#the-list > tr');
  if (!rows.length) return;
  rows.forEach((row, i) => {
    const sample = samples[i % samples.length];
    row.querySelectorAll('[data-field-type]').forEach(el => {
      const t = (el.getAttribute('data-field-type') || '').toLowerCase();
      if (t === 'email')          el.textContent = sample.email;
      else if (t === 'name')      el.textContent = sample.name;
      else if (t === 'textarea')  el.textContent = sample.message;
      else if (t === 'text')      el.textContent = sample.name;
    });
  });
}

// admin-entry-detail — replace the entry's field values by class. Looks at
// the field-item's class list (.wpforms-field-name / -email / -textarea) and
// falls back to the heading text for less common fields.
export function dummyEntryDetail(doc, sample = DUMMY.sampleEntries[0]) {
  doc.querySelectorAll('.wpforms-entry-field-item').forEach(item => {
    const val = item.querySelector('.wpforms-entry-field-value');
    if (!val) return;
    const cls = item.className || '';
    const heading = (item.querySelector('.wpforms-entry-field-name')?.textContent || '').toLowerCase();
    if (cls.includes('wpforms-field-email') || heading.includes('email')) {
      val.innerHTML = `<a href="mailto:${sample.email}">${sample.email}</a>`;
    } else if (cls.includes('wpforms-field-name') || heading.includes('name')) {
      val.textContent = sample.name;
    } else if (cls.includes('wpforms-field-textarea') || heading.includes('paragraph') || heading.includes('message')) {
      val.textContent = sample.message;
    }
    // Other field types: leave value alone (structure varies; redactIPs and
    // stripEmailTraces handle the universal cases).
  });
}

// admin-payments — rewrite the list anchor label to "#N - <Name>" and any
// customer cell email to the demo customer.
export function dummyPaymentRow(doc, sample = DUMMY.samplePayment) {
  doc.querySelectorAll('a[href*="payment_id="]').forEach(a => {
    const t = a.textContent || '';
    const m = t.match(/^\s*(#\d+)\s*-/);
    a.textContent = m ? `${m[1]} - ${sample.name}` : `#1 - ${sample.name}`;
  });
  doc.querySelectorAll('.column-customer, .column-customer-email').forEach(td => {
    const a = td.querySelector('a');
    if (a) a.textContent = sample.name;
  });
}

// admin-payment-detail — replace each `.wpforms-payment-entry-field` block by
// class (name/email/textarea + payment subtypes + stripe). Multi-line value
// cells (checkbox/multiple/select) are joined with `<br>` to preserve the
// product's visual structure.
export function dummyPaymentDetail(doc, sample = DUMMY.samplePayment) {
  doc.querySelectorAll('.wpforms-payment-entry-field').forEach(field => {
    const val = field.querySelector('.wpforms-payment-entry-field-value');
    if (!val) return;
    const cls = field.className || '';
    if (cls.includes('wpforms-field-email')) {
      val.innerHTML = `<a href="mailto:${sample.email}">${sample.email}</a>`;
    } else if (cls.includes('wpforms-field-name')) {
      val.textContent = sample.name;
    } else if (cls.includes('wpforms-field-textarea')) {
      val.textContent = sample.message;
    } else if (cls.includes('wpforms-field-payment-single')) {
      val.textContent = sample.paymentSingle;
    } else if (cls.includes('wpforms-field-payment-checkbox')) {
      val.innerHTML = sample.paymentCheckbox.join('<br>');
    } else if (cls.includes('wpforms-field-payment-multiple')) {
      val.innerHTML = sample.paymentMultiple.join('<br>');
    } else if (cls.includes('wpforms-field-payment-select')) {
      val.innerHTML = sample.paymentSelect.join('<br>');
    } else if (cls.includes('wpforms-field-stripe-credit-card')) {
      val.innerHTML = sample.stripe.join('<br>');
    }
    // Total / non-classed fields left untouched.
  });
}
