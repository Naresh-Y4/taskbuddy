const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../config/db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/tasks
router.get('/', async (req, res) => {
  const { status, priority, search, sort = 'created_at', order = 'desc' } = req.query;
  const userId = req.user.id;

  let sql = `SELECT t.*,
    GROUP_CONCAT(DISTINCT tg.name ORDER BY tg.name SEPARATOR ',') as tag_names,
    GROUP_CONCAT(DISTINCT tg.color ORDER BY tg.name SEPARATOR ',') as tag_colors,
    GROUP_CONCAT(DISTINCT tg.id ORDER BY tg.name SEPARATOR ',') as tag_ids
    FROM tasks t
    LEFT JOIN task_tags tt ON t.id = tt.task_id
    LEFT JOIN tags tg ON tt.tag_id = tg.id
    WHERE t.user_id = ?`;

  const params = [userId];
  if (status && status !== 'all') { sql += ' AND t.status = ?'; params.push(status); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  if (search) { sql += ' AND (t.title LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const sortMap = {
    priority: "FIELD(t.priority,'urgent','high','medium','low')",
    created_at: 't.created_at', due_date: 't.due_date', title: 't.title'
  };
  sql += ` GROUP BY t.id ORDER BY ${sortMap[sort] || 't.created_at'} ${order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;

  try {
    const [rows] = await db.query(sql, params);
    const tasks = rows.map(row => ({
      ...row,
      tags: row.tag_ids
        ? row.tag_ids.split(',').map((id, i) => ({
            id: parseInt(id),
            name: (row.tag_names || '').split(',')[i] || '',
            color: (row.tag_colors || '').split(',')[i] || '#6366f1',
          }))
        : [],
      tag_ids: undefined, tag_names: undefined, tag_colors: undefined,
    }));

    const [stats] = await db.query(`
      SELECT COUNT(*) as total,
        SUM(status='todo') as todo,
        SUM(status='in_progress') as in_progress,
        SUM(status='done') as done,
        SUM(due_date < CURDATE() AND status != 'done') as overdue
      FROM tasks WHERE user_id = ?`, [userId]);

    res.json({ tasks, stats: stats[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, status = 'todo', priority = 'medium', due_date, emoji = '📝', tags = [] } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO tasks (user_id, title, description, status, priority, due_date, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description || null, status, priority, due_date || null, emoji]
    );
    const taskId = result.insertId;

    for (const tagName of tags) {
      if (!tagName.trim()) continue;
      const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      const [tagResult] = await conn.query(
        'INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
        [req.user.id, tagName.trim(), color]
      );
      await conn.query('INSERT IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tagResult.insertId]);
    }

    await conn.commit();
    const [task] = await db.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    res.status(201).json({ task: task[0], message: 'Task created! 🎉' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// PUT /api/tasks/:id
router.put('/:id', [param('id').isInt()], async (req, res) => {
  const { title, description, status, priority, due_date, emoji } = req.body;
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (due_date !== undefined) updates.due_date = due_date || null;
  if (emoji !== undefined) updates.emoji = emoji;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  try {
    const [result] = await db.query('UPDATE tasks SET ? WHERE id = ? AND user_id = ?',
      [updates, req.params.id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    const [task] = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ task: task[0], message: 'Task updated! ✅' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', [param('id').isInt()], async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted! 💨' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', [
  param('id').isInt(),
  body('status').isIn(['todo', 'in_progress', 'done']),
], async (req, res) => {
  try {
    const [result] = await db.query('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?',
      [req.body.status, req.params.id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Status updated!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;