const express = require('express');
const router = express.Router();
const db = require('../db/queries');
const authMiddleware = require('../middleware/auth');

// GET all tasks for logged in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const tasks = await db.getAllTasks(date || null, req.user.id);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// DELETE a task
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await db.deleteTask(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted', task: deleted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;