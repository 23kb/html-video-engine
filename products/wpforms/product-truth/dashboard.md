# Product truth — WPForms Dashboard (2.0.2)

**Source:** the published doc `https://wpforms.com/docs/navigating-the-wpforms-dashboard/` (final text mirrored at
`umair-wiki/CVs/newer/new 32.txt`, 2026-09-10) and the RC source notes
`umair-wiki/wpforms-releases/release-2.0.2/notes/dashboard-ui-reference.md`. Every label below is verbatim
from the product. Captured UI: `snapshots/admin-dashboard` (Elite, Geolocation + Coupons active, Last 30
days) and `snapshots/admin-wp-home` (entry point).
**Verified by:** the doc is Umair's own, published. UI labels verified against the 2.0.2 templates.

## Availability

- WPForms **2.0.2 and later**, Lite and paid. Only WordPress **Administrators** see it. Users given WPForms
  access through Access Controls land where they did before.
- It is the **first page you see when you open WPForms**: clicking **WPForms** in the admin menu, or
  **WPForms » Dashboard**. Before 2.0.2 that click opened Forms Overview, which is still at **WPForms » All Forms**.
- Not the same thing as the **WPForms dashboard widget** on the WordPress home screen (a small recent-entries box).

## Tier gating (the ad must not blur these)

| Element | Lite | Basic+ | Pro / Elite |
|---|---|---|---|
| Stat cards | Forms · Entries Backed Up · Total Views, always last 30 days | Forms · Total Entries · Total Views · Spam Entries | same |
| Date range picker | no (always last 30 days) | yes | yes |
| Entries widget | called **Forms**; counts Lite Connect backups | Entries + Views | + **Interactions** and **Conversion** columns |
| Top Locations | no | no | **Pro or higher + Geolocation addon** |
| Payments widget | works with Stripe, PayPal, Square; Coupons card links to upgrade | yes | yes |

Our capture is Elite with everything on. An ad built on it shows the fullest state; copy must not claim
Lite sees Interactions, Conversion, Locations or a date picker.

## Page anatomy (three areas)

1. **Stat cards** (row under the title): **Forms**, **Total Entries**, **Total Views**, **Spam Entries**.
   Spam needs *Store Spam Entries in the Database* on for a form, or ActiveLayer. An **Anti-Spam Setup**
   card appears when no spam protection is configured. Captured values: 53 · 690 · 5,768 · 2 (30 days);
   the 7-day set is harvested and real.
2. **Main column:** Entries widget → Payments widget → Top Locations widget → addon and integration tiles.
3. **Sidebar:** License · WP Mail SMTP · What's New · Recommended Growth Tools · Spam & Security Checkup ·
   Getting Started.

## Date range

Button reads **Last 30 days** by default. Presets: **Today, Yesterday, Last 7 days, Last 30 days, Last 90
days, Last 1 year, Custom** (calendar + **Apply**). Changing it updates stat cards, entries, payments and
locations, and writes the range into the page URL. Custom ranges are capped at **1 year** (daily totals are
kept for a year). Totals refresh about **once an hour**, so a brand-new entry can lag.

## Entries widget

- Chart of entries per day across all forms; below it a table of the **5 forms with the most entries**.
- Columns: **Form Name** (opens the builder) · **Entries** (opens the entries list) · **Views · Interactions ·
  Conversion** (open Form Analytics) · **Chart**.
- **Chart column:** click the **chart icon** to scope the chart to that form; a red **X** replaces it to
  return to the combined chart.
- **Gear** → *Display Options*: **Display Chart** (checkbox), **Number of Forms** (3–10), **form list**
  (checklist, max 10; ticking any form disables Number of Forms). **Save Changes** refreshes without a
  reload. **Reset icon** next to the gear restores defaults. Settings are per user.
- Captured: 9 of 53 forms have entries in range; top five by entries are real.

## Payments widget

- A smaller Payments page: sales chart, stat cards, recent payments (date, type, total, status; click for
  details). Cards: **Total Sales, Total Payments, New Subscriptions, Subscription Renewals, Total Refunded,
  Coupons Redeemed**. **Click a card to switch the chart to that metric.**
- Gear: chart on/off, stat cards on/off, which cards, number of recent payments.
- Only **live** payments; test mode is excluded. With no gateway: **Connect with Stripe** button + Payment
  Settings link.

## Top Locations widget

- Table of countries with each one's share of entries + a donut with the total that has location data.
- Gear: **Number of Countries** (3–5), **Exclude** (checkbox per country, e.g. a country only sending spam).
- Captured top five: United States, Mexico, United Kingdom, Canada, Australia; Germany is sixth.
- A **Universally** translate suggestion can appear beneath it (large non-site-language share, last 30 days).
  **Do not build on it:** the shipping copy is the wording Matt rejected 2026-08-06.

## Sidebar

- **License:** level + version. No key → orange card + **Activate License** + a fullscreen prompt. Expired →
  red card + **Renew Now**.
- **WP Mail SMTP:** **Install WP Mail SMTP**, dismissable per account.
- **What's New:** latest feature + **See What Else is New**.
- **Recommended Growth Tools:** AIOSEO, Duplicator etc. + **Install**.
- **Spam & Security Checkup:** spam protection (ActiveLayer or a CAPTCHA) and privacy (WPConsent or GDPR
  Enhancements); passed checks get a green tick, the alternative is crossed out; **Additional Information** links.
- **Getting Started:** five guides + **View All Documentation**.

## Known facts that may move

- Issue #18796 (1-year custom-range cap) may be fixed before release.
- Install/Activate buttons appear only where the account can install plugins; otherwise tiles link out.

## Rulings for on-screen copy

- Every number on screen is a captured value; none are typed by hand. The 7-day set comes from the
  harvest, the 30-day set from the capture.
- The **old landing page** contrast is real and doc-stated: Forms Overview was the landing page before 2.0.2.
- The dashboard widget (WP home) and the Dashboard page are different products; never show the widget's
  chart as the Dashboard's.
