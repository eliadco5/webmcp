const { chromium } = require('C:/Users/eliad.cohen/projects/tania/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Login via API
  const apiReq = await context.request.post('http://localhost:3000/api/login', {
    data: { username: 'alice', password: 'password' },
    headers: { 'Content-Type': 'application/json' },
  });
  const loginBody = await apiReq.json();
  console.log('Login:', loginBody.success, 'user:', loginBody.user?.displayName);

  const page = await context.newPage();

  // Intercept fetch calls from inside the page BEFORE navigation
  await page.addInitScript(() => {
    const origFetch = window.fetch;
    window.fetch = function(...args) {
      console.log('[FETCH-INTERCEPT]', args[0], typeof args[1] === 'object' ? JSON.stringify(args[1]).slice(0,100) : '');
      return origFetch.apply(this, args).then(r => {
        console.log('[FETCH-RESPONSE]', args[0], r.status, r.headers.get('content-type'));
        return r;
      }).catch(e => {
        console.log('[FETCH-ERROR]', args[0], e.message);
        throw e;
      });
    };
  });

  // Listen for errors
  page.on('pageerror', err => console.log('[PAGE-ERROR]', err.message));
  page.on('console', msg => {
    const t = msg.type();
    if (t === 'error' || msg.text().startsWith('[FETCH')) {
      console.log('[browser-' + t + ']', msg.text());
    }
  });

  await page.goto('http://localhost:3000/');
  console.log('URL after goto:', page.url());

  // Wait up to 8 seconds for the header
  await page.waitForTimeout(8000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('\nPage text (first 300):', bodyText.slice(0, 300));
  console.log('Has "Signed in as":', bodyText.includes('Signed in as'));

  await page.screenshot({ path: 'C:/tmp/header_check.png' });
  console.log('Screenshot saved');

  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
