// @rev kc-31
import type { Assignment, Branch, Order, Rule } from './types.ts';
import { distanceKm } from './geo.ts';

export const MAX_GEO_KM = 42;

export function assignBranch(
  order: Order,
  branches: Branch[],
  isFull: (b: Branch) => boolean = () => false,
): Assignment {
  const own = branches.filter((b) => b.storeId === order.storeId && b.active);

  if (order.manualBranchId) {
    const manual = own.find((b) => b.id === order.manualBranchId);
    if (manual) return { orderId: order.id, branchId: manual.id, rule: 'manual' };
  }

  const assignOrFallback = (branch: Branch, rule: Rule): Assignment =>
    isFull(branch)
      ? nearestAssignment(order, own.filter((b) => !isFull(b)))
      : { orderId: order.id, branchId: branch.id, rule };

  if (own.length === 1) {
    return assignOrFallBack(own[0], 'single');
  }

  const { pickupPointId } = order;
  if (pickupPointId) {
    const pickup = own.find((b) => b.pickupPointIds.includes(pickupPointId));
    if (pickup) {
      return assignOrFallBack(pickup, 'pickup_point');
    }
  }

  const inCity = own.filter((b) => b.city === order.city);
  if (inCity.length === 1) {
    return assignOrFallBack(inCity[0], 'city');
  }

  const nearest = findNearest(order, inCity.length > 1 ? inCity : own);
  if (!nearest) return { orderId: order.id, branchId: null, rule: 'unassigned' };
  if (nearest.km > MAX_GEO_KM) return { orderId: order.id, branchId: null, rule: 'too_far' };

  return assignOrFallBack(nearest.branch, 'geo');
}

function nearestAssignment(order: Order, candidates: Branch[]): Assignment {
  const nearest = findNearest(order, candidates);
  if (!nearest) return { orderId: order.id, branchId: null, rule: 'unassigned' };
  if (nearest.km > MAX_GEO_KM) return { orderId: order.id, branchId: null, rule: 'too_far' };
  return { orderId: order.id, branchId: nearest.branch.id, rule: 'geo' };
}

function findNearest(order: Order, branches: Branch[]): { branch: Branch; km: number } | null {
  if (order.lat === null || order.lon === null) return null;

  let best: { branch: Branch; km: number } | null = null;
  for (const b of branches) {
    const km = distanceKm(order.lat, order.lon, b.lat, b.lon);
    if (!best || km < best.km) best = { branch: b, km };
  }
  return best;
}
