const assert = require('node:assert/strict');
const { parseSetCommand } = require('./voice.js');
assert.deepEqual(parseSetCommand('Bench press, eight reps, forty kilos total'),
  { exercise: 'bench press', reps: 8, load: 40, unit: 'kg', load_type: 'total' });
assert.equal(parseSetCommand('Row, 10 reps, twenty two point five kg per hand').load, 22.5);
assert.equal(parseSetCommand('Curl, 8 reps, 20 lb').load_type, null);
assert.equal(parseSetCommand('Press, 8 reps, 0 kg total').load, 0);
for (const text of ['bench press', 'squat, zero reps, 40 kg', 'curl, 8 reps, many kilos', 'curl, 8 reps, -1 kg']) {
  assert.throws(() => parseSetCommand(text));
}
console.log('Voice draft parsing checks passed.');
