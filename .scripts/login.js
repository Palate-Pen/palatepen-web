const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://app.palateandpen.co.uk');
  console.log('Browser open. Log in, then CLOSE the browser window — state will be saved.');

  // Save state periodically in case anything panics
  const tick = setInterval(async () => {
    try { await ctx.storageState({ path: '.scripts/auth-state.json' }); } catch {}
  }, 5000);

  await new Promise(resolve => browser.on('disconnected', resolve));
  clearInterval(tick);
  try { await ctx.storageState({ path: '.scripts/auth-state.json' }); } catch {}
  console.log('AUTH_SAVED');
})();
