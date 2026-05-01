// One-off diagnostic: log which admin chrome elements exist on a live WP admin
// page after login, BEFORE any capture transforms run. Read-only.
const { chromium } = require('playwright');
const WP_URL  = process.env.WP_URL;
const WP_USER = process.env.WP_USER;
const WP_PASS = process.env.WP_PASS;
const target  = process.argv[2] || '/wp-admin/admin.php?page=wpforms-overview';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page    = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(WP_URL + '/wp-login.php', { waitUntil: 'networkidle' });
  await page.fill('#user_login', WP_USER);
  await page.fill('#user_pass',  WP_PASS);
  await Promise.all([page.click('#wp-submit'), page.waitForURL(/wp-admin/, { timeout: 15000 })]);
  await page.goto(WP_URL + target, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const probe = await page.evaluate(() => {
    const ids = ['wpadminbar','wpwrap','adminmenuback','adminmenumain','adminmenuwrap','adminmenu','wp-toolbar','wpcontent','wpbody','wpfooter'];
    const out = {};
    for (const id of ids) out['#'+id] = !!document.getElementById(id);
    out['body.classList'] = Array.from(document.body.classList);
    return out;
  });
  console.log(JSON.stringify(probe, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
