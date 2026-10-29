const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto('file:///home/claude/out/script_generator.html');
  // legacy csv
  await p.setInputFiles('#tagFile', '/home/claude/tags.csv');
  console.log('LEGACY:', await p.textContent('#tagSummary'), '|', (await p.$$eval('#tagMsgs .msg', e=>e.map(x=>x.textContent))).join(' || '));
  await p.setInputFiles('#tagFile', '/home/claude/out/tags_example.csv');
  console.log('NEW:', await p.textContent('#tagSummary'), '|', (await p.$$eval('#tagMsgs .msg', e=>e.map(x=>x.textContent))).join(' || '));
  await p.setInputFiles('#libFile', '/home/claude/1793229538712_StandardScripts.xlsx');
  console.log('LIB:', await p.textContent('#libSummary'));
  // open Safe Start in checker
  await p.click('a[data-open="2"]');
  const iss = await p.$$eval('#issues li', e=>e.map(x=>x.textContent));
  console.log('OPEN sheet issues:', iss.length, iss.slice(0,4));
  // generate prompt with one example
  await p.check('#sheetList input[value="2"]');
  await p.fill('#scriptName', 'Flow Cycling 60C');
  await p.fill('#request', 'Warm the cell to 60 C with the valve open and 2 slpm flow. Once temperature is stable, cycle flow between 1 and 3 slpm five times, 2 minutes each. Then return everything to defaults.');
  await p.click('#generate');
  const prompt = await p.inputValue('#promptOut');
  require('fs').writeFileSync('prompt.txt', prompt);
  console.log('PROMPT chars', prompt.length);
  console.log('ERRORS', errs);
  await b.close();
})();
