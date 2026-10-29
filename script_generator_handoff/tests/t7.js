const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/out/script_generator.html');
  await p.setInputFiles('#tagFile', '/home/claude/out/tags_pem_simple.csv');
  for (const [name, f, out] of [['markov','reply_markov.txt','markov.xlsx'],['markov nested','reply_markov_nested.txt','markov_nested.xlsx']]) {
    await p.fill('#scriptName', name); await p.fill('#request', 'x');
    await p.click('#generate'); await p.fill('#replyIn', fs.readFileSync(f, 'utf8')); await p.click('#checkReply');
    console.log(name.toUpperCase()+':', await p.textContent('#summary'), await p.$$eval('#issues li', e => e.map(x => x.textContent)));
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#download')]); await dl.saveAs('/home/claude/out/' + out);
  }
  // nesting rule tests
  const r = await p.evaluate(() => {
    const aoa = [["Section","Values"],["Setup","Parameter","Tag"],[],["Pretest"],[],
      ["Matrix","*Comment","*Duration","*Ramp","*PostStep Script","LB_CURRENT_DENSITY_SP"],
      ["","start",1,"","",0],
      ["","For CountA = 1 to 3"],
      ["","    For CountB = 1 to 2"],
      ["","        row",5,"","Deep",0.1],
      ["","    Next CountB"],
      ["","Next CountA"],
      [],["PostStep","PostStep Name","Deep"],
      ["","Step Type","For"],["","For","CountA"],["","=",1],["","To",2],[],
      ["","Step Type","For"],["","For","CountB"],["","=",1],["","To",2],[],
      ["","Step Type","Update"],["","Duration",1],[],
      ["","Step Type","Next"],["","Next","CountB"],[],
      ["","Step Type","Next"],["","Next","CountA"],
      ["End"]];
    return validate(aoa).issues.map(i => `${i.level[0].toUpperCase()} r${i.row==null?'-':i.row+1}: ${i.msg}`);
  });
  console.log('NESTING TESTS:'); r.forEach(x => console.log('  ', x));
  console.log('ERRORS', errs); await b.close();
})();
