// @rev kc-31
import { createServer, type Server, type ServerResponse } from 'node:http';
import { branches, orders } from './store.ts';
import { assignOrder } from './assignments.ts';

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
