# Test Script Generator: Project Handoff

This document records everything decided, learned and built in the original working session, so a new assistant (or person) can continue without the chat history. Read it top to bottom before changing anything. File locations refer to this package.

---

## 1. Goal

Build a tool that helps researchers write **test-engine scripts**: spreadsheet "recipes" run by an old but reliable **LabVIEW** test engine. An LLM suggests the script; code checks it and writes the .xlsx.

- **Users:** about 100 researchers across many fields (the example material is PEM fuel cells, but the tool must not be fuel-cell specific). Most have never used Python. Some publish code on GitHub.
- **One sheet per run.** Researchers keep their own library workbook and paste finished sheets into it.
- **Each researcher has their own tag CSV** (their instrument tags plus working variables).
- **LLM options available to the organisation:**
  - Gemini Enterprise: everyone has browser access. An earlier attempt to build a Gemini agent "got stuck really quick".
  - LiteLLM with Anthropic and OpenAI models (keys can be generated per user), plus **free local models such as gpt-oss-120b**. The owner prefers the local models, because keys for them don't need to be guarded closely.

## 2. Architecture decision

**Core principle: the LLM only suggests; code does everything else.** One giant prompt doing parsing, design, validation and formatting is what made the Gemini attempt fail.

1. Code reads the tag CSV and optional example sheets and builds a compact prompt.
2. The LLM returns the script as **structured JSON** (schema in section 6).
3. Code validates the JSON against the CSV and the engine grammar. In automatic mode, errors go back to the LLM for up to 2 fix rounds.
4. The researcher reviews and edits the result in an editable grid.
5. Code writes the .xlsx in the engine's exact layout.

**Delivery options considered:**
| Option | Description | Status |
|---|---|---|
| A. Single HTML file | Everything runs in the browser (JavaScript); calls LiteLLM directly | **Built.** Needs LiteLLM to allow CORS |
| B. Small hosted web app | Same logic on an internal server; key stays server-side | Fallback if CORS is blocked |
| C. Gemini Enterprise custom agent | Built with Google's Agent Development Kit, with Python tools for validation | Possible later; needs a GCP admin |

The HTML tool also has a **Copy & paste mode**: it produces a prompt to paste into any chat assistant (Gemini, Claude, ChatGPT) and then checks the pasted reply. This works today with no setup, and is a permanent fallback.

**No Python is needed for researchers.** The page is self-contained (the SheetJS library is embedded) and works offline, apart from the LLM call. The API key is not built into the file: each user enters it once, and it is remembered in their browser's localStorage.

**Pending:** the owner will run `tools/litellm_connection_test.html` on the real network to check (1) that a browser can reach LiteLLM (CORS) and (2) that gpt-oss-120b supports JSON-schema / JSON mode. If CORS fails, move to option B.

## 3. Script sheet format (the engine's input)

Column A holds section markers. Columns B and C hold key/value pairs.

| Row content | Meaning |
|---|---|
| `Section` / `Values` | Header row 1 |
| `Setup` / `Parameter` / `Tag` | Header row 2 (Setup is usually empty) |
| `Pretest` | Steps that run once before the matrix |
| `Matrix` | Matrix header: `*Comment`, `*Duration`, `*Ramp`, `*PostStep Script`, then one column per tag |
| `PostStep` / `PostStep Name` / name | A named step block, called from a matrix row's PostStep column |
| `PostTest` | Steps that run once after the matrix |
| `End` | End of script |
| `//` in column A | **Comment / ignored line** everywhere (used for the matrix units row and section headings) |

A **step** starts with `Step Type` in column B and the type in column C. The following B/C rows are its fields, until the next `Step Type` or section marker. Blank rows inside a step are allowed (Conditional blocks use them).

**Matrix rows:** each row sets its tag columns (a **blank cell keeps the previous value**), ramps Analog values over `*Ramp` seconds, holds for `*Duration` seconds, then runs its PostStep.

### Engine rules confirmed by the owner (important)
1. **A matrix row's PostStep runs after the row's ramp AND hold have finished.** The next row starts when the PostStep finishes.
2. **Matrix loops are written in the `*Comment` column:** `For CountA = 1 to 5` … `Next CountA`, and `DoWhile tag > value` … `Loop tag`. (The EMDA template uses `For CountA =$CountA to 1000`.)
3. **An ordinary matrix comment must NOT begin with `For `, `Next `, `DoWhile ` or `Loop `** (the word plus a space), because the engine reads these as loop commands.
4. **Rows inside a matrix loop need their comment indented by 4 spaces.** Whether tabs work is unknown, so only spaces are used.
5. **Matrix loops cannot be nested.** To nest, put the inner loop in a PostStep called from a row inside the matrix loop. Two loops nested inside one PostStep also work (StandardScripts "Acc Break In" does this).
6. **Nesting depth: 2 levels are known to work; 3 is unknown.** The checker warns above 2.
7. Assumed (not yet confirmed): a `For`/`Next` line is indented only when it is itself nested; rows between are one level deeper. Since matrix loops can't nest, in practice this means 0 spaces for For/Next and 4 for the body.

### Step types (from `inputs/Test_Engine_Steps.docx` and the example sheets)
Update, Ramp (Analog only), Wait Til (MODE AND/OR, Duration timeout, On Failure, Condition EQ/NE/GT/LT/GE/LE, then tag/value pairs), Wait Til GT / Wait Til LT (legacy), Wait Til Settled (groups of Condition=Stable, Tag Value, Setpoint, Range, Set Time), Conditional (Duration, MODE, IF tag + operator line, THEN assignments, optional ELSE), For / Next (fields For, =, To, Step; Next may take While + condition), DoWhile / Loop, Edit (Prompt + up to 10 tag/caption pairs), Prompt (sync/async + message), Component, Change Alarm, Error Filter, View, End Time, GC Configuration, Pull GC Sample, Timed GC Pull, Wait for All Alarms, Skip if not bool, Skip if gt, Skip if gt eq.

- Values may reference tags with `$` and use arithmetic: `$ABI_NOW + $LB_CURRENT_FB`.
- Data types: Analog, Discrete (ON/OFF or named states), String. **Discrete Array exists in the documentation but is never used**, so it is excluded.
- Case varies in real sheets (`Wait Til`/`Wait til`, `On`/`ON`, `to`/`To`). The tool treats keywords case-insensitively.

## 4. Tag CSV specification

Template: `tags/tags_template.csv`. Example: `tags/tags_example.csv`. Minimal PEM fuel cell set: `tags/tags_pem_simple.csv`.

| Column | Required | Meaning |
|---|---|---|
| Tag | yes | Exact engine tag name |
| Description | yes | Plain words; the LLM's main context |
| Type | yes | Analog, Discrete or String |
| Access | yes | **Write** (set point), **Read** (feedback, can only be tested, never set), **Variable** (working variable such as a loop counter or scratch value) |
| Hi / Lo | Analog | Hard limits; values outside them are errors |
| Units | recommended | |
| Allowed | optional | Discrete states separated by `\|` (e.g. `V\|C`); blank means ON/OFF |
| Default | optional | Starting/safe value; used by the posttest |
| Notes | optional | Rules for the LLM (interlocks, ramp limits). **Not machine-checked** (see open items) |

- Working variables (counters, scratch values) **are listed in the tag file** with Access = Variable. Nested loops need separate counters (CountA, CountB).
- The parser accepts column aliases, any column order, and a trailing empty column (the owner's original `inputs/tags.csv` has Hi before Lo and a trailing comma). A missing Access column means everything is treated as Write, with a warning.

## 5. The tool: `tool/script_generator.html`

Sections: (1) AI assistant mode, Copy & paste or LiteLLM; (2) tag CSV upload; (3) optional library .xlsx upload, tick up to 3 example sheets ("Open" loads any sheet into the checker); (4) script name and request, Generate; (5) review: summary, the assistant's notes, errors and warnings (click to jump to the row), editable sheet grid with live re-checking, download .xlsx, "Ask for changes" revision.

- Example sheets are converted to the output JSON format and included in the prompt (up to 14k characters each).
- Automatic mode: POST `/v1/chat/completions`, `response_format: json_object` (retried without it on HTTP 400), temperature 0.2, max_tokens 16000, 5-minute timeout, up to 2 automatic fix rounds.
- Download: one sheet named after the script (31 characters max). Downloading with errors needs a second click to confirm.

**Source:** `src/script_generator.src.html` (contains a `/*SHEETJS*/` placeholder). **Build:** `python3 src/build.py <path to xlsx.mini.min.js>`, using SheetJS **0.18.5**, `dist/xlsx.mini.min.js` from the npm package `xlsx@0.18.5`. Note: 0.18.5 has known advisories when *reading* maliciously crafted files. Users only read their own files, but IT may prefer a newer build from cdn.sheetjs.com.

## 6. LLM output schema and prompt

The full system prompt is in `src/system_prompt.txt`. It is also embedded in the tool and is the source of truth.

```
{ "script_name": str, "notes": [str],
  "pretest": [Step],
  "matrix": { "tags": [str], "rows": [MatrixRow] },
  "poststeps": [{ "name": str, "steps": [Step] }],
  "posttest": [Step] }
Step      = { "type": str, "fields": [[key, value], ...], "comment": str? }
MatrixRow = { "comment", "duration", "ramp", "poststep", "values": {tag: value} }
          | { "header": str } | { "loop": "For <tag> = <a> to <b>" | "Next <tag>" | "DoWhile <tag> <op> <v>" | "Loop <tag>" }
```
The user part of the prompt contains: the TAG LIST table, EXAMPLES (optional), and REQUEST (script name and description). The tool adds the matrix-loop indentation itself.

## 7. What the checker enforces

- Every tag used exists in the CSV (including `$` references, matched by the longest tag name).
- Read tags are never set (Update, Ramp, matrix columns, THEN/ELSE assignments, Edit, loop index).
- Analog values are numeric and within Hi/Lo (an error when setting, a warning when comparing). Discrete values are in Allowed. Ramp is used only on Analog tags.
- Step grammar: known step types; MODE AND/OR; Condition operators; Wait Til has a Condition and a timeout (warns if none); Wait Til Settled groups are complete; Conditional has IF + operator and THEN, with ELSE only after THEN; For needs `=`/`To`; For/Next and DoWhile/Loop are matched and closed within the same block; Edit has at most 10 tags; Prompt has sync/async.
- Matrix: every PostStep named exists (warns about unused ones; duplicate names are errors); durations and ramps are numeric; the first row should set every column (warning); loop syntax; reserved words at the start of a comment; **no nested matrix loops**; indentation of 4 spaces per level (warns on tabs or a wrong count); total nesting above 2 levels is a warning.
- Not checked: rules written only in **Notes** (ramp rates, interlocks), and physical plausibility (for example, gas stoichiometry against cell area).

## 8. Findings in the owner's files

- `inputs/EMDA_script_template.xlsx`, cell **G21**: the value is `` `OFF `` with a stray backtick.
- `inputs/script_templates-Elliot.xlsx`, Steps sheet: says Wait Til "Mode: LT, GT, EQ, OR". The documentation and all examples use MODE = AND/OR, with the operator in Condition.
- `inputs/StandardScripts.xlsx`, **HAD - GAMRY row 91**: `CW_HUMIDIFIER_DRAIN` has no value (probably a missing OFF).
- All 17 StandardScripts sheets otherwise pass the structural checks. That test used a tag list built automatically from the tags the sheets use.

## 9. Test results so far

- `outputs/Flow_Cycling_60C.xlsx`: Claude as the LLM, using `tags_example.csv`. Request: "Warm the cell to 60 C with the valve open and 2 slpm flow. Once temperature is stable, cycle flow between 1 and 3 slpm five times, 2 minutes each. Then return everything to defaults." Passed.
- A deliberately bad reply (`tests/reply_bad.txt`): all 8 planted errors were caught.
- `outputs/markov.xlsx`: startup plus a Markov-style drive cycle, using `tags_pem_simple.csv`. Passed. (Its temperature-stable timeout of 2400 s is longer than needed now that PostStep timing is confirmed; about 900 s would be enough.)
- `outputs/markov_nested.xlsx`: the same with a 2-level nested loop (matrix For CountA, PostStep "Stop and go" with For CountB). Passed.
- `outputs/road_test.xlsx`: a reply from another model, pasted in by the owner. It **passed the checker but breaks the 2 °C/min Note**: the posttest cool-down is 65 to 25 °C in 600 s (4 °C/min) and should be at least 1200 s. Also weak: its low-voltage PostStep only logs and doesn't reduce the load; the load is enabled before warm-up; the stability wait has no On Failure. This case motivates the MaxRate column proposal below.
- Automatic mode was tested against a simulated LiteLLM server: one fix round, then a revision. Both worked.

## 10. Open items / next steps

1. **Run the CORS / structured-output test** on the real network (`tools/litellm_connection_test.html`). If it passes, use automatic mode with gpt-oss-120b; otherwise build option B.
2. **Proposed and awaiting the owner's decision:** optional machine-checkable CSV columns:
   - `MaxRate` (units per minute): the checker computes the rate of every Ramp step and matrix ramp.
   - `Requires` (e.g. `ANODE_FLOW_REQ>0 & CATHODE_FLOW_REQ>0`): interlock checks.
3. Test gpt-oss-120b and Gemini output quality on the same requests used in section 9.
4. Confirm whether tabs work for indentation, and whether 3 levels of nesting work.
5. Decide distribution (shared drive or intranet page) and write a one-page how-to for researchers.
6. Optional: a Python version of the same core for GitHub-savvy researchers (batch use).

## 11. Package contents

| Path | What |
|---|---|
| `HANDOFF.md` | This document |
| `tool/script_generator.html` | The working tool (self-contained) |
| `tools/litellm_connection_test.html` | CORS / structured-output test page |
| `src/script_generator.src.html`, `src/build.py` | Source and build script |
| `src/system_prompt.txt` | The LLM system prompt |
| `tags/` | CSV template, example, minimal PEM fuel cell set |
| `outputs/` | Sheets generated during testing, plus the markov nested JSON reply |
| `tests/` | Playwright test scripts, mock LiteLLM servers, sample LLM replies, the generated prompt, temporary tag lists. Scripts use absolute paths from the original workspace; adjust before running |
| `inputs/` | The owner's original files: tags.csv, StandardScripts.xlsx, EMDA and Elliot templates, Test Engine Steps.docx |
