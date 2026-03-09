import express from 'express';
import linkTokenRouter from './routes/linkToken';
import exchangeTokenRouter from './routes/exchangeToken';
import transferRouter from './routes/transfer';
import plaidTransferRouter from './routes/plaidTransfer';
import remittanceRouter from './routes/remittance';

const app = express();
app.use(express.json());

app.use('/api/create_link_token', linkTokenRouter);
app.use('/api/exchange_token', exchangeTokenRouter);
app.use('/api/transfer', transferRouter);
app.use('/api/plaid_transfer', plaidTransferRouter);
app.use('/api/remittance', remittanceRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ACH server running on http://localhost:${PORT}`);
  console.log(`Plaid env: ${process.env.PLAID_ENV || 'sandbox'}`);
});
