const test = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../src/validation');
test('validates asset ranges and required fields', () => {
  assert.deepEqual(validate('asset', { name: 'Server', value: 10, priority: 4 }), []);
  assert.ok(validate('asset', { name: '', value: -1, priority: 9 }).length);
});
test('allows partial risk updates but rejects unknown values', () => {
  assert.deepEqual(validate('risk', { damage: 4 }, true), []);
  assert.ok(validate('risk', { damage: 5 }, true).includes('damage'));
});
