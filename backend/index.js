import pool from './db.js';

async function testDB() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Conexão OK:', res.rows[0]);
  } catch (err) {
    console.error('Erro na conexão:', err);
  }
}

testDB();
