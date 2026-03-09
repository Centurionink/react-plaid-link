import { Router, Request, Response } from 'express';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { public_token } = req.body as { public_token: string };
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

  const response = await fetch(`${plaidBaseUrl}/item/public_token/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, secret, public_token }),
  });

  const data = await response.json();
  if (!response.ok) return res.status(response.status).json(data);
  return res.json({ access_token: data.access_token, item_id: data.item_id });
});

export default router;
