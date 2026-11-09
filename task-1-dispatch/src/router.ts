// @rev kc-31
import type { Assignment, Branch, Order } from './types.ts';
import { distanceKm } from './geo.ts';

export const MAX_GEO_KM = 42;

export function assignBranch(order: Order, branches: Branch[]): Assignment {
  const own = branches.filter((b) => b.storeId === order.storeId && b.active);

  if (order.manualBranchId) {
    const manual = own.find((b) => b.id === order.manualBranchId);
    if (manual) return { orderId: order.id, branchId: manual.id, rule: 'manual' };
  }

  if (own.length === 1) {
    return { orderId: order.id, branchId: own[0].id, rule: 'single' };
  }

  const { pickupPointId } = order;
  if (pickupPointId) {
    const pickup = own.find((b) => b.pickupPointIds.includes(pickupPointId));
    if (pickup) {
      return { orderId: order.id, branchId: pickup.id, rule: 'pickup_point' };
    }
  }

  const inCity = own.filter((b) => b.city === order.city);
  if (inCity.length === 1) {
    return { orderId: order.id, branchId: inCity[0].id, rule: 'city' };
  }

  const nearest = findNearest(order, inCity.length > 1 ? inCity : own);
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
