// @rev kc-31
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { almatyDate, assignOrder, branchLoad } from '../src/assignments.ts';
import { assignments, orders } from '../src/store.ts';

test('almatyDate: 19:00 UTC - уже следующие сутки', () => {
  assert.equal(almatyDate('2026-11-15T19:00:00Z'), '2026-11-16');
});

test('almatyDate: 18:59:59 UTC - еще текущие сутки', () => {
  assert.equal(almatyDate('2026-11-15T18:59:59Z'), '2026-11-15');
});

const orderById = (id: string) => orders.find((o) => o.id === id)!;

test('assignOrder: повторный вызов не занимает лимит ещё раз', () => {
  const first = assignOrder(orderById('o-101'));
  const second = assignOrder(orderById('o-101'));
  assert.deepEqual(first, { orderId: 'o-101', branchId: 'b-ala-1', rule: 'pickup_point' });
  assert.deepEqual(second, first);
  assert.equal(branchLoad('b-ala-1', '2026-11-16'), 1);
});

test('assignOrder: too_far тоже сохраняется', () => {
  const first = assignOrder(orderById('o-107'));
  assert.equal(first.rule, 'too_far');
  assert.deepEqual(assignments.get('o-107'), first);
});
