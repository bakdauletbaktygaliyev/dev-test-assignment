// @rev kc-31
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';

let server: Server;
let base: string;

before(async () => {
  server = createApp();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
  server.closeAllConnections();
});

const assign = (id: string) => fetch(`${base}/orders/${id}/assign`, { method: 'POST' });
const load = (branchId: string, query: string) => fetch(`${base}/branches/${branchId}/load${query}`);

test('assign: нет такого заказа — 404', async () => {
  assert.equal((await assign('nope')).status, 404);
});

test('assign: одновременные и повторные запросы дают один результат и один раз занимают лимит', async () => {
  const responses = await Promise.all(Array.from({ length: 5 }, () => assign('o-104')));
  responses.push(await assign('o-104'));
  const bodies = await Promise.all(responses.map((r) => r.json()));
  for (const body of bodies) {
    assert.deepEqual(body, { orderId: 'o-104', branchId: 'b-ala-2', rule: 'geo' });
  }

  const res = await load('b-ala-2', '?date=2026-11-16');
  assert.deepEqual(await res.json(), { branchId: 'b-ala-2', date: '2026-11-16', assigned: 1, limit: 40 });
});

test('assign: заполненный филиал уступает следующему', async () => {
  for (const id of ['o-101', 'o-108', 'o-109']) await assign(id);

  const full = await load('b-ala-1', '?date=2026-11-16');
  assert.deepEqual(await full.json(), { branchId: 'b-ala-1', date: '2026-11-16', assigned: 3, limit: 3 });

  const res = await assign('o-110');
  assert.deepEqual(await res.json(), { orderId: 'o-110', branchId: 'b-ala-2', rule: 'geo' });
});

test('load: некорректная дата — 400', async () => {
  for (const query of ['', '?date=2026-02-30', '?date=abc']) {
    assert.equal((await load('b-ala-1', query)).status, 400);
  }
});

test('load: нет такого филиала — 404', async () => {
  assert.equal((await load('nope', '?date=2026-11-16')).status, 404);
});
