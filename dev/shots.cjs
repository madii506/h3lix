const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp/h3shots';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const report = {};
  for (const [tag, vp] of [['d', { width: 1440, height: 900 }], ['m', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: tag === 'm', hasTouch: tag === 'm' });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('http://localhost:8833/', { waitUntil: 'load' }); await p.waitForTimeout(4200);
    await p.screenshot({ path: `${OUT}/${tag}-home-hero.jpg`, type: 'jpeg', quality: 80 });
    for (const id of ['loop', 'w1', 'cycle', 'spiral', 'ring', 'w2', 'live', 'console', 'rollout', 'enter']) {
      await p.evaluate(i => document.getElementById(i).scrollIntoView(), id); await p.waitForTimeout(id.startsWith('w') || id === 'enter' ? 4200 : 1500);
      await p.screenshot({ path: `${OUT}/${tag}-home-${id}.jpg`, type: 'jpeg', quality: 80 });
    }
    const over = await p.evaluate(() => ({ docW: document.documentElement.scrollWidth, vw: innerWidth, wide: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && r.width > 0; }).slice(0, 5).map(e => e.className || e.tagName) }));
    // terminal
    await p.goto('http://localhost:8833/terminal', { waitUntil: 'load' }); await p.waitForTimeout(2200);
    await p.screenshot({ path: `${OUT}/${tag}-term-rig.jpg`, type: 'jpeg', quality: 80 });
    for (const t of ['wallet', 'private', 'pairs', 'agent', 'ring', 'spiral', 'holders', 'docs']) {
      await p.click(`.tabs button[data-tab="${t}"]`); await p.waitForTimeout(900);
      await p.screenshot({ path: `${OUT}/${tag}-term-${t}.jpg`, type: 'jpeg', quality: 80, fullPage: tag === 'm' });
    }
    await p.fill('#cmd', 'help').catch(() => {}); await p.press('#cmd', 'Enter').catch(() => {});
    await p.fill('#cmd', 'spiral 2000000 21').catch(() => {}); await p.press('#cmd', 'Enter').catch(() => {});
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/${tag}-term-cmd.jpg`, type: 'jpeg', quality: 80 });
    const tover = await p.evaluate(() => ({ docW: document.documentElement.scrollWidth, vw: innerWidth }));
    report[tag] = { errs, over, tover };
    await ctx.close();
  }
  console.log(JSON.stringify(report, null, 1));
  await b.close();
})();
