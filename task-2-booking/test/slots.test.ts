// @rev kc-31
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSlots } from '../src/slots.ts';
import { almatyDate, almatyInstant, minutesFromDayStart, overlaps, toMinutes } from '../src/time.ts';
import type { Master, Service } from '../src/types.ts';

const day = { from: '10:00', to: '13:00', breaks: [] };

const master: Master = {
  id: 'm-1',
  name: 'Тест',
  schedule: { mon: day, tue: day, wed: day, thu: day, fri: day, sat: null, sun: null },
};

const cut: Service = { id: 's-cut', name: 'Стрижка', durationMin: 60, masterIds: ['m-1'] };

const range = (from: string, to: string) => ({ start: toMinutes(from), end: toMinutes(to) });

test('overlaps: пересекающиеся интервалы', () => {
  assert.equal(overlaps(range('10:00', '11:00'), range('10:30', '11:30')), true);
});

test('overlaps: запись сразу после другой не пересекается', () => {
  assert.equal(overlaps(range('10:00', '11:00'), range('11:00', '12:00')), false);
});

test('getSlots: свободный день', () => {
  // 2030-11-18 — понедельник
  const slots = getSlots(master, cut, '2030-11-18', []);
  assert.deepEqual(slots, ['10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '12:00']);
});

test('getSlots: выходной', () => {
  assert.deepEqual(getSlots(master, cut, '2030-11-23', []), []);
});

test.todo('getSlots: слот не пересекает перерыв');
test.todo('getSlots: занятое время не выдаётся, отменённые записи не мешают');
test.todo('getSlots: прошедшее время не выдаётся');

test('almatyInstant: 10:00 по Алматы — это 05:00 UTC', () => {
  assert.equal(new Date(almatyInstant('2030-11-18', '10:00')).toISOString(), '2030-11-18T05:00:00.000Z');
});

test('minutesFromDayStart: запись в 05:00 UTC — 600 минут от полуночи по Алматы', () => {
  assert.equal(minutesFromDayStart('2030-11-18', '2030-11-18T05:00:00.000Z'), 600);
});

test('almatyDate: 19:30 UTC — уже следующие сутки', () => {
  assert.equal(almatyDate('2030-11-18T19:30:00Z'), '2030-11-19');
});
