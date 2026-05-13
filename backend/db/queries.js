const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

pool.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
  }
});

const db = {
  async getAllTasks(date = null, userId) {
    const query = date
      ? 'SELECT * FROM tasks WHERE scheduled_date = $1 AND user_id = $2 ORDER BY scheduled_time ASC NULLS LAST'
      : 'SELECT * FROM tasks WHERE user_id = $1 ORDER BY scheduled_date ASC, scheduled_time ASC NULLS LAST';
    const params = date ? [date, userId] : [userId];
    const result = await pool.query(query, params);
    return result.rows;
  },

  async createTask({ title, description, scheduled_time, scheduled_date, user_id }) {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, scheduled_time, scheduled_date, user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description || null, scheduled_time || null, scheduled_date || new Date().toISOString().split('T')[0], user_id]
    );
    return result.rows[0];
  },

  async updateTask(id, fields, userId) {
    const allowed = ['title', 'description', 'scheduled_time', 'scheduled_date', 'status'];
    const updates = [];
    const values = [];
    let i = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${i}`);
        values.push(fields[key]);
        i++;
      }
    }

    if (updates.length === 0) throw new Error('No valid fields to update');
    values.push(id);
    values.push(userId);
    const result = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${i} AND user_id = $${i + 1} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async deleteTask(id, userId) {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  },
};

module.exports = db;