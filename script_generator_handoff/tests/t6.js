const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/out/script_generator.html');
  // 1. markov
  await p.setInputFiles('#tagFile', '/home/claude/out/tags_pem_simple.csv');
  await p.fill('#scriptName', 'markov'); await p.fill('#request', 'x');
  await p.click('#generate'); await p.fill('#replyIn', fs.readFileSync('reply_markov.txt', 'utf8')); await p.click('#checkReply');
  console.log('MARKOV:', await p.textContent('#summary .msg'), await p.$$eval('#issues li', e => e.map(x => x.textContent)));
  console.log('  loop rows:', JSON.stringify(await p.evaluate(() => S.aoa.filter(r => /^\s*(for|next|idle|accelerate)/i.test(String(r[1]))).map(r => r[1]).slice(0,4))));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#download')]); await dl.saveAs('/home/claude/out/markov.xlsx');
  // 2. EMDA template
  await p.setInputFiles('#tagFile', 'emda_tags.csv');
  await p.setInputFiles('#libFile', '/home/claude/1793229538713_EMDA_script_template.xlsx');
  await p.click('a[data-open="0"]');
  console.log('EMDA:', await p.$$eval('#issues li', e => e.map(x => x.textContent)));
  // 3. crafted bad matrix
  const r = await p.evaluate(() => {
    const aoa = [["Section","Values"],["Setup","Parameter","Tag"],[],["Pretest"],[],
      ["Matrix","*Comment","*Duration","*Ramp","*PostStep Script","POV-102","POV-202"],
      ["","initial",1,"","","ON","OFF"],
      ["","For 5 min hold everything",300],
      ["","For CountA = 1 to 3"],
      ["","  two spaces only",5,"","","OFF"],
      ["","    DoWhile temp_fb < 50"],
      ["","\tTabbed row",5,"","","","ON"],
      ["","        Correct nested row",5],
      ["","    Next CountA"],
      ["","Loop temp_fb"],
      ["","    stray indent",5],
      ["","DoWhile temp_fb"],
      ["End"]];
    return validate(aoa).issues.map(i => `${i.level[0].toUpperCase()} r${i.row==null?'-':i.row+1}: ${i.msg}`);
  });
  console.log('CRAFTED:'); r.forEach(x => console.log('  ', x));
  console.log('ERRORS', errs);
  await b.close();
})();
