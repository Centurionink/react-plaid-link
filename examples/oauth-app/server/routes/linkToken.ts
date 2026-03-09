import { Router, Request, Response } from 'express';

const router = Router();

router.post('/', async (_req: Request, res: Response) => {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV || 'sandbox';

  if (!clientId || !secret) {
    return res.status(500).json({ error: 'PLAID_CLIENT_ID and PLAID_SECRET must be set' });
  }

  const plaidBaseUrl =
    env === 'production'
      ? 'https://production.plaid.com'
      : env === 'development'
      ? 'https://development.plaid.com'
      : 'https://sandbox.plaid.com';

  const response = await fetch(`${plaidBaseUrl}/link/token/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      client_name: 'ACH Demo',
      country_codes: ['US'],
      language: 'en',
      user: { client_user_id: 'demo-user' },
      products: ['auth', 'transfer'],
    }),
  });

  const data = await response.json();
  if (!response.ok) return res.status(response.status).json(data);
  return res.json({ link_token: data.link_token });
});

export default router;
