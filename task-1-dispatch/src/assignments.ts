// @rev kc-31
import { assignBranch } from './router.ts';
import { assignments, branches, orders } from './store.ts';
import type { Assignment, Branch, Order } from './types.ts';

const ALMATY_OFFSET_MS = 5 * 60 * 60 * 1000;

// YYYY-MM-DD
export function almatyDate(iso: string): string {
  return new Date(Date.parse(iso) + ALMATY_OFFSET_MS).toISOString().slice(0, 10);
}

export function branchLoad(branchId: string, date: string): number {
  let count = 0;
  for (const assignment of assignments.values()) {
    if (assignment.branchId !== branchId) continue;
    const order = orders.find((o) => o.id === assignment.orderId);
    if (order && almatyDate(order.createdAt) === date) count += 1;
  }
  return count;
}

// Между проверкой и записью нет await, поэтому гонки здесь быть не может
export function assignOrder(order: Order): Assignment {
  const existing = assignments.get(order.id);
  if (existing) return existing;

  const day = almatyDate(order.createdAt);
  const isFull = (b: Branch) => branchLoad(b.id, day) >= b.dailyLimit;
  const assignment = assignBranch(order, branches, isFull);
  assignments.set(order.id, assignment);
  return assignment;
}
