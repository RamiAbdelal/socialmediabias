import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const port = parseInt(process.env.PORT || "3001", 10);

app.get('/', (_, res) => res.json({ message: 'Backend is running!' }));

app.listen(port, '0.0.0.0', () => {
  console.info(`Backend listening on port ${port}`);
});
