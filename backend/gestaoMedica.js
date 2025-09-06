// backend/gestaoMedica.js
import express from 'express';
import pool from './db.js';

const router = express.Router();

// GET todos os médicos
router.get('/medicos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM medicos');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST criar novo médico
router.post('/medicos', async (req, res) => {
  const { nome, crm, especialidade } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO medicos(nome, crm, especialidade) VALUES($1, $2, $3) RETURNING *',
      [nome, crm, especialidade]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET todos os plantões
router.get('/plantoes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM plantoes');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST criar plantão
router.post('/plantoes', async (req, res) => {
  const { medico_id, data, turno } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO plantoes(medico_id, data, turno) VALUES($1, $2, $3) RETURNING *',
      [medico_id, data, turno]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
