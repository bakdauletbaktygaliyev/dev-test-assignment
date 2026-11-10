// @rev kc-31
import { createServer, type Server, type ServerResponse } from 'node:http';
import { branches, orders } from './store.ts';
import { assignOrder, branchLoad } from './assignments.ts';

export function createApp(): Server {
  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);

    try {
      if (req.method === 'GET' && url.pathname === '/branches') {
        return send(res, 200, branches);
      }

      if (req.method === 'GET' && parts[0] === 'orders' && parts.length === 2) {
        const order = orders.find((o) => o.id === parts[1]);
        if (!order) return send(res, 404, { error: 'order_not_found' });
        return send(res, 200, order);
      }

      if (req.method === 'POST' && parts[0] === 'orders' && parts.length === 3 && parts[2] === 'assign') {
        const order = orders.find((o) => o.id === parts[1]);
        if (!order) return send(res, 404, { error: 'order_not_found' });
        return send(res, 200, assignOrder(order));
      }

      if (req.method === 'GET' && parts[0] === 'branches' && parts.length === 3 && parts[2] === 'load') {
        const date = url.searchParams.get('date');
        if (!date || !isValidDate(date)) return send(res, 400, { error: 'invalid_date' });

        const branch = branches.find((b) => b.id === parts[1]);
        if (!branch) return send(res, 404, { error: 'branch_not_found' });

        return send(res, 200, {
          branchId: branch.id,
          date,
          assigned: branchLoad(branch.id, date),
          limit: branch.dailyLimit,
        });
      }

      send(res, 404, { error: 'not_found' });
    } catch (err) {
      console.error(err);
      send(res, 500, { error: 'internal' });
    }
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
