const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage();
  await p.goto('file:///home/claude/out/script_generator.html');
  await p.setInputFiles('#tagFile', '/home/claude/out/tags_pem_simple.csv');
  await p.fill('#scriptName', 'road test'); await p.fill('#request', 'x');
  await p.click('#generate'); await p.fill('#replyIn', fs.readFileSync(process.argv[2], 'utf8')); await p.click('#checkReply');
  console.log(await p.textContent('#summary'), await p.$$eval('#issues li', e => e.map(x => x.textContent)));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#download')]); await dl.saveAs('/home/claude/out/road_test.xlsx'); console.log('saved', dl.suggestedFilename());
  await b.close();
})();
