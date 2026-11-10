// @rev kc-31
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { almatyDate } from '../src/assignments.ts';

test('almatyDate: 19:00 UTC - уже слудующие сутки', () => {
  assert.equal(almatyDate('2026-11-15T19:00:00Z'), '2026-11-16');
});

test('almatyDate: 18:59:59 UTC - еще текущие сутки', () => {
  assert.equal(almatyDate('2026-11-15T18:59:59Z'), '2026-11-15');
});
