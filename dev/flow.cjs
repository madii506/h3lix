const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp/h3s3'; require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const vp = process.env.M ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const p = await b.newPage({ viewport: vp, isMobile: !!process.env.M, hasTouch: !!process.env.M });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const tag = process.env.M ? 'm' : 'd';
  await p.goto('http://localhost:8833/'); await p.waitForTimeout(4500);
  await p.screenshot({ path: `${OUT}/${tag}-0-gate.jpg`, type: 'jpeg', quality: 78 });
  await p.click('#gEnter'); await p.waitForTimeout(1600);
  await p.screenshot({ path: `${OUT}/${tag}-1-fly.jpg`, type: 'jpeg', quality: 78 });
  await p.waitForFunction(() => !document.body.classList.contains('locked'), null, { timeout: 30000 }).catch(() => errs.push('never unlocked'));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/${tag}-2-in.jpg`, type: 'jpeg', quality: 78 });
  const at = async (id, k, name) => {
    await p.evaluate(([id, k]) => { const el = document.getElementById(id); const top = el.getBoundingClientRect().top + scrollY; scrollTo(0, top + k * Math.max(0, el.offsetHeight - innerHeight)); }, [id, k]);
    await p.waitForTimeout(1400); await p.screenshot({ path: `${OUT}/${tag}-${name}.jpg`, type: 'jpeg', quality: 78 });
  };
  await at('about', 0.55, '3-words'); await at('loop', 0.15, '4-loop-a'); await at('loop', 0.7, '5-loop-b');
  await at('w1', 0, '6-w1'); await at('ring', 0.55, '7-enc'); await at('ring', 1, '8-enc-done'); await at('rollout', 0.2, '9-roll');
  const over = await p.evaluate(() => ({ docW: document.documentElement.scrollWidth, vw: innerWidth }));
  console.log(JSON.stringify({ errs, over }));
  await b.close();
})();
