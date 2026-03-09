import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { insertTransfer } from '../db';

const router = Router();

const handleTransfer = (type: 'debit' | 'credit') =>
  async (req: Request, res: Response) => {
    const { access_token, amount, memo } = req.body as {
      access_token: string;
      amount: number;
      memo?: string;
    };

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

    // Step 1: create authorization
    const authRes = await fetch(`${plaidBaseUrl}/transfer/authorization/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        access_token,
        type,
        network: 'ach',
        amount: String(amount),
        ach_class: 'ppd',
        user: { legal_name: 'Demo User' },
      }),
    });

    const authData = await authRes.json();
    if (!authRes.ok) return res.status(authRes.status).json(authData);

    // Step 2: create transfer
    const transferRes = await fetch(`${plaidBaseUrl}/transfer/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        access_token,
        authorization_id: authData.authorization.id,
        type,
        network: 'ach',
        amount: String(amount),
        description: memo || `ACH ${type}`,
        ach_class: 'ppd',
        user: { legal_name: 'Demo User' },
      }),
    });

    const transferData = await transferRes.json();
    if (!transferRes.ok) return res.status(transferRes.status).json(transferData);

    const now = new Date().toISOString();
    const row = {
      id: uuidv4(),
      type,
      amount,
      currency: 'USD',
      status: 'pending' as const,
      memo,
      access_token,
      plaid_transfer_id: transferData.transfer.id,
      created_at: now,
      updated_at: now,
    };
    insertTransfer(row);

    return res.json({
      transfer_id: row.id,
      plaid_transfer_id: row.plaid_transfer_id,
      status: row.status,
      amount,
      currency: 'USD',
      created_at: now,
    });
  };

router.post('/debit', handleTransfer('debit'));
router.post('/credit', handleTransfer('credit'));

export default router;
