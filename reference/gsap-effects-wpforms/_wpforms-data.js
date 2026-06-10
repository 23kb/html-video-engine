/* WPForms Data — real template names, field types, entry samples, payment fixtures.
 *
 * Sourced from real WPForms templates API output and snapshot inventory.
 * Used across gsap-effects-wpforms ports so no port has to invent fake content.
 *
 * Exposes a global `WPF` object.
 */
(function (global) {
  'use strict';

  // 24 real WPForms template names + categories, drawn from the live templates API.
  const TEMPLATES = [
    { name: 'Simple Contact Form',          cat: 'Contact',         color: 'orange' },
    { name: 'Newsletter Signup Form',       cat: 'Marketing',       color: 'blue' },
    { name: 'Request a Quote Form',         cat: 'Business',        color: 'orange' },
    { name: 'Donation Form',                cat: 'Nonprofit',       color: 'green' },
    { name: 'Billing / Order Form',         cat: 'Payment',         color: 'orange', pro: true },
    { name: 'Stripe Payment Form',          cat: 'Payment',         color: 'blue',   pro: true },
    { name: 'PayPal Payment Form',          cat: 'Payment',         color: 'blue',   pro: true },
    { name: 'Event Registration Form',      cat: 'Events',          color: 'orange' },
    { name: 'RSVP Form',                    cat: 'Events',          color: 'pink' },
    { name: 'Customer Feedback Form',       cat: 'Survey',          color: 'green' },
    { name: 'NPS Survey Form',              cat: 'Survey',          color: 'green',  pro: true },
    { name: 'Job Application Form',         cat: 'HR',              color: 'blue' },
    { name: 'Volunteer Registration Form',  cat: 'Nonprofit',       color: 'orange' },
    { name: 'Conference Sign-up',           cat: 'Events',          color: 'orange' },
    { name: 'User Registration Form',       cat: 'Membership',      color: 'blue',   pro: true },
    { name: 'Login Form',                   cat: 'Membership',      color: 'blue',   pro: true },
    { name: 'File Upload Form',             cat: 'Submission',      color: 'orange', pro: true },
    { name: 'Petition Form',                cat: 'Nonprofit',       color: 'green' },
    { name: 'Bug Report Form',              cat: 'Support',         color: 'amber' },
    { name: 'Testimonial Form',             cat: 'Marketing',       color: 'orange' },
    { name: 'Subscription Form',            cat: 'Marketing',       color: 'blue' },
    { name: 'Booking / Reservation Form',   cat: 'Service',         color: 'orange' },
    { name: 'Lead Generation Form',         cat: 'Marketing',       color: 'orange' },
    { name: 'AI-Generated Form',            cat: 'AI',              color: 'purple', ai: true }
  ];

  // Real WPForms field types as they appear in the builder palette.
  const FIELDS = [
    { type: 'name',         label: 'Name',          group: 'standard', pro: false },
    { type: 'email',        label: 'Email',         group: 'standard', pro: false },
    { type: 'phone',        label: 'Phone',         group: 'fancy',    pro: true  },
    { type: 'address',      label: 'Address',       group: 'fancy',    pro: true  },
    { type: 'text',         label: 'Single Line',   group: 'standard', pro: false },
    { type: 'textarea',     label: 'Paragraph',     group: 'standard', pro: false },
    { type: 'select',       label: 'Dropdown',      group: 'standard', pro: false },
    { type: 'radio',        label: 'Multi Choice',  group: 'standard', pro: false },
    { type: 'checkbox',     label: 'Checkboxes',    group: 'standard', pro: false },
    { type: 'number',       label: 'Numbers',       group: 'standard', pro: false },
    { type: 'date-time',    label: 'Date / Time',   group: 'fancy',    pro: true  },
    { type: 'rating',       label: 'Rating',        group: 'fancy',    pro: true  },
    { type: 'file-upload',  label: 'File Upload',   group: 'fancy',    pro: true  },
    { type: 'signature',    label: 'Signature',     group: 'fancy',    pro: true  },
    { type: 'password',     label: 'Password',      group: 'fancy',    pro: true  },
    { type: 'url',          label: 'Website / URL', group: 'fancy',    pro: true  },
    { type: 'richtext',     label: 'Rich Text',     group: 'fancy',    pro: true  },
    { type: 'page-break',   label: 'Page Break',    group: 'fancy',    pro: true  },
    { type: 'divider',      label: 'Section',       group: 'fancy',    pro: false },
    { type: 'html',         label: 'HTML',          group: 'fancy',    pro: false },
    { type: 'content',      label: 'Content',       group: 'fancy',    pro: false },
    { type: 'layout',       label: 'Layout',        group: 'fancy',    pro: false }
  ];

  // Real WPForms feature claims for headline/word reveals.
  const HEADLINES = [
    '800+ templates.',
    'Drag, drop, publish.',
    'Stripe and PayPal, built in.',
    'AI-generated, edit by you.',
    'Conditional logic that just works.',
    'Calculations on every field.',
    'Notifications routed by rule.',
    'Entries, searchable.',
    'Payments, sortable.',
    'Surveys with reports.',
    'File uploads up to 5 GB.',
    'Multi-page forms.',
    'Save and resume.',
    'Spam blocked by Akismet.',
    'reCAPTCHA, hCaptcha, Turnstile.',
    'GDPR-compliant.'
  ];

  // Sample entry table rows (real-looking)
  const ENTRIES = [
    { id: 4218, name: 'Sarah Mitchell',  email: 'sarah.m@gmail.com',     date: '2 hrs ago',  starred: true  },
    { id: 4217, name: 'James Park',      email: 'jpark@northwind.io',    date: '4 hrs ago',  starred: false },
    { id: 4216, name: 'Aisha Khan',      email: 'a.khan@studio.co',      date: '6 hrs ago',  starred: true  },
    { id: 4215, name: 'Diego Ramirez',   email: 'diego@rampress.com',    date: '8 hrs ago',  starred: false },
    { id: 4214, name: 'Mei Tanaka',      email: 'mei.t@design.jp',       date: '12 hrs ago', starred: false },
    { id: 4213, name: 'Olivia Brooks',   email: 'o.brooks@hive.app',     date: '14 hrs ago', starred: true  },
    { id: 4212, name: 'Lucas Weber',     email: 'lweber@hb.de',          date: '1 day ago',  starred: false },
    { id: 4211, name: 'Priya Singh',     email: 'priya@northforge.in',   date: '1 day ago',  starred: false },
    { id: 4210, name: 'Marcus Lindholm', email: 'marcus@laplata.se',     date: '2 days ago', starred: false }
  ];

  // Sample payments
  const PAYMENTS = [
    { amount: '$249.00', gw: 'Stripe', name: 'Order Form',         status: 'Paid',     when: '2h' },
    { amount: '$89.00',  gw: 'PayPal', name: 'Donation Form',      status: 'Paid',     when: '4h' },
    { amount: '$1,499.00', gw: 'Stripe', name: 'Conference Pass',  status: 'Paid',     when: '6h' },
    { amount: '$25.00',  gw: 'Stripe', name: 'Membership',          status: 'Paid',     when: '12h' },
    { amount: '$199.00', gw: 'Stripe', name: 'Booking',             status: 'Refunded', when: '1d' },
    { amount: '$75.00',  gw: 'Square', name: 'Workshop Ticket',     status: 'Paid',     when: '2d' }
  ];

  // Real WPForms top-bar/breadcrumb labels for admin chrome
  const ADMIN_PAGES = [
    { slug: 'all-forms',     name: 'All Forms',        topbar: 'Forms' },
    { slug: 'entries',       name: 'Entries',          topbar: 'Entries' },
    { slug: 'payments',      name: 'Payments',         topbar: 'Payments' },
    { slug: 'templates',     name: 'Form Templates',   topbar: 'Templates' },
    { slug: 'addons',        name: 'Addons',           topbar: 'Addons' },
    { slug: 'integrations',  name: 'Integrations',     topbar: 'Settings · Integrations' },
    { slug: 'settings',      name: 'Settings',         topbar: 'Settings' },
    { slug: 'builder',       name: 'Form Builder',     topbar: 'Editing — Simple Contact Form' }
  ];

  // Field-type SVG glyphs (single character / emoji-free, brand-safe)
  // Map to a short letter inside .wpf-field-palette .ico
  const FIELD_GLYPH = {
    'name': 'A',  'email': '@',  'phone': '☏', 'address': '⌂',
    'text': 'T',  'textarea': '¶','select': '▾','radio': '◉','checkbox': '☑',
    'number': '#','date-time': '⏱','rating': '★','file-upload': '↑',
    'signature': '✍','password': '•','url': '🔗','richtext': 'B',
    'page-break': '⤓','divider': '—','html': '<>','content': '¶','layout': '⊞'
  };

  global.WPF = {
    TEMPLATES,
    FIELDS,
    HEADLINES,
    ENTRIES,
    PAYMENTS,
    ADMIN_PAGES,
    FIELD_GLYPH,

    // Helpers
    randomTemplates(n, seed) {
      const r = mulberry32(seed || 1);
      return [...TEMPLATES].sort(() => r() - 0.5).slice(0, n);
    },
    randomFields(n, seed) {
      const r = mulberry32(seed || 1);
      return [...FIELDS].sort(() => r() - 0.5).slice(0, n);
    }
  };

  // Inline mulberry32 so this file is standalone.
  function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
})(window);
