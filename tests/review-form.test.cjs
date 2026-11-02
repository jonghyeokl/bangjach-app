const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(require.resolve('../lib/review-form.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports: exportsObject },
);
const { elapsedSeconds, durationText, peopleText, localDate } = exportsObject;
test('remaining time preserves second precision and validates limits', () => {
  assert.equal(elapsedSeconds(60, '12', '30'), 2850);
  assert.equal(durationText(2850), '47분 30초');
  assert.equal(elapsedSeconds(60, '', ''), null);
  assert.equal(elapsedSeconds(60, '0', '0'), 3600);
  assert.equal(elapsedSeconds(60, '60', '0'), 0);
  assert.equal(elapsedSeconds(60, '', '30'), 3570);
  for (const [m, s] of [
    ['61', '0'],
    ['0', '60'],
    ['-1', '0'],
    ['1.5', '0'],
  ])
    assert.throws(() => elapsedSeconds(60, m, s));
});
test('5+ labels and today use local calendar fields', () => {
  assert.equal(peopleText(2), '2인');
  assert.equal(peopleText(5), '5인+');
  assert.equal(peopleText(7), '5인+');
  assert.equal(localDate(new Date(2026, 0, 1, 0, 5)), '2026-01-01');
});
