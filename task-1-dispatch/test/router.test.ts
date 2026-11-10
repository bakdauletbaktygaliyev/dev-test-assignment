// @rev kc-31
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignBranch } from '../src/router.ts';
import { distanceKm } from '../src/geo.ts';
import type { Branch, Order } from '../src/types.ts';

const branch = (over: Partial<Branch>): Branch => ({
  id: 'b-1',
  storeId: 's-1',
  name: 'Филиал',
  city: 'Алматы',
  lat: 43.24,
  lon: 76.91,
  active: true,
  pickupPointIds: [],
  dailyLimit: 100,
  ...over,
});

const order = (over: Partial<Order>): Order => ({
  id: 'o-1',
  storeId: 's-1',
  city: 'Алматы',
  lat: 43.25,
  lon: 76.92,
  pickupPointId: null,
  manualBranchId: null,
  createdAt: '2026-11-16T06:00:00Z',
  ...over,
});

const almaty = branch({ id: 'b-ala', city: 'Алматы', lat: 43.2567, lon: 76.9286 });
const astana = branch({ id: 'b-ast', city: 'Астана', lat: 51.128, lon: 71.43 });

test('distanceKm: Алматы — Астана около 970 км', () => {
  const d = distanceKm(43.2389, 76.8897, 51.1694, 71.4491);
  assert.ok(Math.abs(d - 970) < 15, `получили ${d.toFixed(1)}`);
});

test('manual: заказ уходит в указанный филиал', () => {
  const res = assignBranch(order({ manualBranchId: 'b-ast' }), [almaty, astana]);
  assert.deepEqual(res, { orderId: 'o-1', branchId: 'b-ast', rule: 'manual' });
});

test('manual: неактивный филиал пропускается', () => {
  const closed = { ...astana, active: false };
  const res = assignBranch(order({ manualBranchId: 'b-ast' }), [almaty, closed]);
  assert.notEqual(res.rule, 'manual');
});

test('single: у магазина один активный филиал', () => {
  const res = assignBranch(order({ city: 'Шымкент' }), [almaty]);
  assert.deepEqual(res, { orderId: 'o-1', branchId: 'b-ala', rule: 'single' });
});

test('geo: выбирается ближайший филиал', () => {
  const res = assignBranch(order({ city: 'Конаев', lat: 43.25, lon: 76.93 }), [almaty, astana]);
  assert.deepEqual(res, { orderId: 'o-1', branchId: 'b-ala', rule: 'geo' });
});

test('geo: без координат заказ не распределяется', () => {
  const res = assignBranch(order({ city: 'Конаев', lat: null, lon: null }), [almaty, astana]);
  assert.equal(res.rule, 'unassigned');
});


const second = branch({ id: 'b-ala-2', city: 'Алматы', lat: 43.265, lon: 76.835 });

// Точка на заданном расстоянии к северу от филиала almaty
const latAtKm = (km: number) => almaty.lat + (km / 6371) * (180 / Math.PI);

test('pickup_point: пункт выдачи закреплён за филиалом', () => {
  const served = { ...astana, pickupPointIds: ['pp-1'] };
  const res = assignBranch(order({ pickupPointId: 'pp-1' }), [almaty, served]);
  assert.deepEqual(res, { orderId: 'o-1', branchId: 'b-ast', rule: 'pickup_point' });
});

test('pickup_point: неактивный филиал пропускается', () => {
  const closed = { ...astana, active: false, pickupPointIds: ['pp-1'] };
  const res = assignBranch(order({ pickupPointId: 'pp-1' }), [almaty, second, closed]);
  assert.equal(res.rule, 'geo');
});

test('city: в городе заказа один филиал магазина', () => {
  const res = assignBranch(order({}), [almaty, astana]);
  assert.deepEqual(res, { orderId: 'o-1', branchId: 'b-ala', rule: 'city' });
});

test('geo: если в городе несколько филиалов, выбирается ближайший из них', () => {
  const outside = branch({ id: 'b-out', city: 'Конаев', lat: 43.266, lon: 76.836 });
  const res = assignBranch(order({ lat: 43.265, lon: 76.84 }), [almaty, second, outside]);
  assert.deepEqual(res, { orderId: 'o-1', branchId: 'b-ala-2', rule: 'geo' });
});

test('geo: филиал ближе 42 км подходит', () => {
  const res = assignBranch(order({ city: 'Конаев', lat: latAtKm(41.9), lon: almaty.lon }), [almaty, astana]);
  assert.deepEqual(res, { orderId: 'o-1', branchId: 'b-ala', rule: 'geo' });
});

test('geo: филиал дальше 42 км не подходит', () => {
  const res = assignBranch(order({ city: 'Конаев', lat: latAtKm(42.1), lon: almaty.lon }), [almaty, astana]);
  assert.deepEqual(res, { orderId: 'o-1', branchId: null, rule: 'too_far' });
});

const full = (...ids: string[]) => (b: Branch) => ids.includes(b.id);
const near = branch({ id: 'b-near', city: 'Конаев', lat: 43.3, lon: 76.95 });

test('лимит: заполненный филиал пропускается', () => {
  const res = assignBranch(order({}), [almaty, near], full('b-ala'));
  assert.deepEqual(res, { orderId: 'o-1', branchId: 'b-near', rule: 'geo' });
});

test('лимит: manual не проверяет лимит', () => {
  const res = assignBranch(order({ manualBranchId: 'b-ala' }), [almaty, astana], full('b-ala'));
  assert.deepEqual(res, { orderId: 'o-1', branchId: 'b-ala', rule: 'manual' });
});

test('лимит: single заполнен, других филиалов нет', () => {
  const res = assignBranch(order({}), [almaty], full('b-ala'));
  assert.deepEqual(res, { orderId: 'o-1', branchId: null, rule: 'unassigned' });
});

test('лимит: pickup_point заполнен, заказ уходит в ближайший', () => {
  const served = { ...almaty, pickupPointIds: ['pp-1'] };
  const res = assignBranch(order({ pickupPointId: 'pp-1' }), [served, near], full('b-ala'));
  assert.deepEqual(res, { orderId: 'o-1', branchId: 'b-near', rule: 'geo' });
});

test('лимит: geo заполнен, заказ уходит в следующий ближайший', () => {
  const res = assignBranch(order({}), [almaty, second], full('b-ala'));
  assert.deepEqual(res, { orderId: 'o-1', branchId: 'b-ala-2', rule: 'geo' });
});

test('лимит: без координат запасной филиал не найти', () => {
  const res = assignBranch(order({ lat: null, lon: null }), [almaty, astana], full('b-ala'));
  assert.deepEqual(res, { orderId: 'o-1', branchId: null, rule: 'unassigned' });
});

test('лимит: незаполненный филиал дальше 42 км', () => {
  const res = assignBranch(order({}), [almaty, astana], full('b-ala'));
  assert.deepEqual(res, { orderId: 'o-1', branchId: null, rule: 'too_far' });
});

test('лимит: все филиалы заполнены', () => {
  const res = assignBranch(order({}), [almaty, astana], full('b-ala', 'b-ast'));
  assert.deepEqual(res, { orderId: 'o-1', branchId: null, rule: 'unassigned' });
});
