import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { insertTransfer, getRemittanceHistory } from '../db';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { access_token, amount, currency, recipient_name, recipient_country, memo } =
    req.body as {
      access_token: string;
      amount: number;
      currency: string;
      recipient_name: string;
      recipient_country: string;
      memo?: string;
    };

  const now = new Date().toISOString();
  const row = {
    id: uuidv4(),
    type: 'remittance' as const,
    amount,
    currency,
    status: 'pending' as const,
    memo,
    recipient_name,
    recipient_country,
    access_token,
    created_at: now,
    updated_at: now,
  };

  insertTransfer(row);

  return res.json({
    remittance_id: row.id,
    status: row.status,
    amount,
    currency,
    recipient_name,
    recipient_country,
    memo,
    created_at: now,
  });
});

router.get('/history', (_req: Request, res: Response) => {
  const records = getRemittanceHistory();
  return res.json(records);
});

export default router;
