const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [port, name] of [[8701,'cors'],[8702,'nocors']]) {
    await p.goto('file:///home/claude/out/litellm_connection_test.html');
    await p.fill('#base', `http://127.0.0.1:${port}/v1/`); await p.fill('#key','sk-test');
    await p.click('#run');
    await p.waitForFunction(() => !document.getElementById('run').disabled, null, {timeout: 30000});
    const r = await p.$$eval('.test', els => els.map(e => e.querySelector('.badge').textContent + ' | ' + e.querySelector('.detail').textContent.slice(0,140).replace(/\n/g,' ')));
    console.log('==', name); r.forEach(x => console.log('  ', x));
    await p.screenshot({path: `shot_${name}.png`, fullPage: true});
  }
  await b.close();
})();
