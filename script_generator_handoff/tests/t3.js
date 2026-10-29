const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1200, height: 1000 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/out/script_generator.html');
  await p.setInputFiles('#tagFile', '/home/claude/out/tags_example.csv');
  await p.fill('#scriptName', 'Flow Cycling 60C');
  await p.fill('#request', 'Warm the cell to 60 C with the valve open and 2 slpm flow. Once temperature is stable, cycle flow between 1 and 3 slpm five times, 2 minutes each. Then return everything to defaults.');
  // BAD
  await p.click('#generate');
  await p.fill('#replyIn', fs.readFileSync('reply_bad.txt', 'utf8'));
  await p.click('#checkReply');
  console.log('BAD issues:'); (await p.$$eval('#issues li', e => e.map(x => x.textContent))).forEach(x => console.log('  ', x));
  console.log('FIX PROMPT:\n', (await p.inputValue('#promptOut')).slice(0, 300));
  // GOOD
  await p.fill('#replyIn', fs.readFileSync('reply_good.txt', 'utf8'));
  await p.click('#checkReply');
  console.log('GOOD msgs:', await p.$$eval('#genMsgs .msg', e => e.map(x => x.textContent)));
  console.log('GOOD issues:', await p.$$eval('#issues li', e => e.map(x => x.textContent)));
  await p.locator('#resultCard').screenshot({ path: 'result_good.png' });
  // edit a cell: set flow 3 -> 7 in row "Flow 3 slpm"
  const rowIdx = await p.evaluate(() => S.aoa.findIndex(r => String(r[1]).trim() === 'Flow 3 slpm'));
  const colIdx = await p.evaluate(() => S.aoa.find(r => r[0] === 'Matrix').indexOf('flow_sp'));
  const cell = p.locator(`#sheet tr[data-r="${rowIdx}"] td[data-c="${colIdx}"]`);
  await cell.click(); await p.keyboard.press('Control+A'); await p.keyboard.type('7'); await p.waitForTimeout(700);
  console.log('AFTER EDIT:', await p.$$eval('#issues li', e => e.map(x => x.textContent)));
  await cell.click(); await p.keyboard.press('Control+A'); await p.keyboard.type('3'); await p.waitForTimeout(700);
  console.log('AFTER UNDO:', await p.$$eval('#issues li', e => e.map(x => x.textContent)), await p.textContent('#summary .msg'));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#download')]);
  await dl.saveAs('/home/claude/out/Flow_Cycling_60C.xlsx');
  console.log('DOWNLOADED', dl.suggestedFilename(), 'ERRORS', errs);
  await b.close();
})();
