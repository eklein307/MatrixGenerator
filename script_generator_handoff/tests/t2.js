const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///home/claude/out/script_generator.html');
  await p.setInputFiles('#libFile', '/home/claude/1793229538712_StandardScripts.xlsx');
  const out = await p.evaluate(() => {
    // gather tag names + sample values from all sheets
    const seen = new Map();
    const note = (n, v) => { if (!n) return; const k = lc(n); if (!seen.has(k)) seen.set(k, { name: String(n).trim(), vals: [] }); if (!isBlank(v)) seen.get(k).vals.push(v); };
    const KEYS = new Set(["duration","mode","condition","on failure","if","then","else","for","=","to","step","next","while","dowhile","loop","prompt","tag value","setpoint","range","set time","eq","ne","gt","lt","ge","le","!=",">","<",">=","<="]);
    for (const sh of S.library) {
      const P = parseAOA(sh.aoa);
      const steps = [...P.pretest, ...P.posttest, ...P.poststeps.flatMap(p => p.steps)];
      for (const st of steps) {
        const ty = lc(st.type);
        if (ty === "component") continue;
        st.fields.forEach((f, i) => {
          const k = lc(f.k);
          if (ty === "edit" && k !== "prompt") { note(f.k); return; }
          if (["if","for","next","dowhile","loop","while","tag value"].includes(k)) { note(f.v); return; }
          if (!KEYS.has(k)) note(f.k, f.v);
        });
      }
      P.matrix.tagCols.forEach(tc => P.matrix.rows.forEach(r => note(tc.name, r.values?.[tc.name])));
      P.matrix.rows.forEach(r => { if (r.loop) { const m = r.loop.match(/^for\s+(\S+)/i); if (m) note(m[1], 1); } });
    }
    let csv = "Tag,Description,Type,Access,Hi,Lo,Units,Allowed,Default,Notes\n";
    for (const t of seen.values()) {
      const vs = t.vals.filter(v => !(typeof v === "string" && v.includes("$")));
      const allNum = vs.length && vs.every(v => isFinite(Number(v)));
      const allBool = vs.length && vs.every(v => ["on","off"].includes(lc(v)));
      let type = allNum ? "Analog" : allBool ? "Discrete" : (vs.length ? "Discrete" : "Analog");
      let allowed = "";
      if (type === "Discrete" && !allBool) { const set = [...new Set(vs.map(v => String(v).toUpperCase()))]; if (set.length <= 6) allowed = set.join("|"); else type = "String"; }
      csv += `"${t.name}",,${type},Write,,,,${allowed},,\n`;
    }
    return csv;
  });
  require('fs').writeFileSync('fc_tags.csv', out);
  await p.setInputFiles('#tagFile', 'fc_tags.csv');
  const n = await p.evaluate(() => S.library.length);
  for (let i = 0; i < n; i++) {
    const r = await p.evaluate((i) => { const sh = S.library[i]; const v = validate(sh.aoa); return { name: sh.name, iss: v.issues.map(x => `${x.level[0].toUpperCase()} r${x.row==null?'-':x.row+1}: ${x.msg}`) }; }, i);
    const e = r.iss.filter(x => x.startsWith('E'));
    console.log(`== ${r.name}: ${e.length} errors, ${r.iss.length - e.length} warnings`);
    e.slice(0, 8).forEach(x => console.log('   ', x));
  }
  await b.close();
})();
