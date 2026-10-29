const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/out/script_generator.html');
  await p.click('text=LiteLLM (automatic)');
  await p.fill('#apiBase', 'http://127.0.0.1:8703'); await p.fill('#apiKey', 'sk-x');
  await p.setInputFiles('#tagFile', '/home/claude/out/tags_example.csv');
  await p.fill('#request', 'Warm to 60 C, cycle flow 1/3 slpm five times.');
  await p.click('#generate');
  await p.waitForFunction(() => !document.getElementById('generate').disabled && document.getElementById('genStatus').textContent.startsWith('Done'), null, { timeout: 20000 });
  console.log('STATUS:', await p.textContent('#genStatus'), '| issues:', await p.$$eval('#issues li', e => e.length));
  await p.fill('#revision', 'Make each flow step 3 minutes.');
  await p.click('#revise');
  await p.waitForFunction(() => !document.getElementById('revise').disabled, null, { timeout: 20000 });
  console.log('REVISE STATUS:', await p.textContent('#genStatus'), 'ERRORS', errs);
  await b.close();
})();
