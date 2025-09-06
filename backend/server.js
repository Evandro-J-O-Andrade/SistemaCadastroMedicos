// backend/server.js
import express from 'express';
import cors from 'cors';
import gestaoMedicaRoutes from './gestaoMedica.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', gestaoMedicaRoutes);

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});
