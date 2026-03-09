import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';

const USE_REAL_API = Boolean(process.env.PLAID_CLIENT_ID);

const mockHandlers: Record<string, (body: Record<string, unknown>) => unknown> = {
  'POST /api/create_link_token': () => ({
    link_token: `mock-link-token-${Date.now()}`,
  }),
  'POST /api/exchange_token': () => ({
    access_token: `mock-access-${Date.now()}`,
    item_id: `mock-item-${Date.now()}`,
  }),
  'POST /api/transfer/debit': (body) => ({
    transfer_id: `mock-debit-${Date.now()}`,
    plaid_transfer_id: `mock-plaid-debit-${Date.now()}`,
    status: 'pending',
    amount: body.amount,
    currency: 'USD',
    created_at: new Date().toISOString(),
  }),
  'POST /api/transfer/credit': (body) => ({
    transfer_id: `mock-credit-${Date.now()}`,
    plaid_transfer_id: `mock-plaid-credit-${Date.now()}`,
    status: 'pending',
    amount: body.amount,
    currency: 'USD',
    created_at: new Date().toISOString(),
  }),
  'POST /api/plaid_transfer': (body) => ({
    transfer_id: `mock-plaid-${Date.now()}`,
    plaid_transfer_id: `mock-plaid-transfer-${Date.now()}`,
    authorization_id: `mock-auth-${Date.now()}`,
    status: 'pending',
    amount: body.amount,
    currency: 'USD',
    created_at: new Date().toISOString(),
  }),
  'POST /api/remittance': (body) => ({
    remittance_id: `mock-rem-${Date.now()}`,
    status: 'pending',
    amount: body.amount,
    currency: body.currency || 'USD',
    recipient_name: body.recipient_name,
    recipient_country: body.recipient_country,
    memo: body.memo,
    created_at: new Date().toISOString(),
  }),
  'GET /api/remittance/history': () => [
    {
      id: 'mock-rem-history-1',
      type: 'remittance',
      amount: 250.0,
      currency: 'PHP',
      status: 'settled',
      recipient_name: 'Maria Santos',
      recipient_country: 'PH',
      memo: 'Family support',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'mock-rem-history-2',
      type: 'remittance',
      amount: 100.0,
      currency: 'MXN',
      status: 'pending',
      recipient_name: 'Carlos Rivera',
      recipient_country: 'MX',
      memo: 'Rent',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
};

const mockApiPlugin = (): Plugin => ({
  name: 'mock-api',
  configureServer(server) {
    server.middlewares.use(
      (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || '';
        if (!url.startsWith('/api/')) return next();
        const method = (req.method || 'GET').toUpperCase();
        const path = url.split('?')[0];
        const key = `${method} ${path}`;
        const handler = mockHandlers[key];
        if (!handler) return next();
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          let parsed: Record<string, unknown> = {};
          try { parsed = JSON.parse(body || '{}'); } catch { /* empty */ }
          const result = handler(parsed);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        });
      }
    );
  },
});

export default defineConfig({
  plugins: [
    react(),
    ...(!USE_REAL_API ? [mockApiPlugin()] : []),
  ],
  server: {
    allowedHosts: [
      '5173--019cd08e-26c9-78e3-9109-72804c1eaee6.us-east-1-01.gitpod.dev',
      '5174--019cd08e-26c9-78e3-9109-72804c1eaee6.us-east-1-01.gitpod.dev',
      'centurion.ink',
      'bsia.space',
    ],
    ...(USE_REAL_API
      ? { proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } } }
      : {}),
  },
});
