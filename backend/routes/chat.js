const express = require('express');
const router = express.Router();
const db = require('../db/queries');
const Groq = require('groq-sdk');
const authMiddleware = require('../middleware/auth');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Prefer the user's local date (sent by the browser) so "today" is correct in
// their timezone; fall back to the server's UTC date.
function resolveToday(clientToday) {
  if (typeof clientToday === 'string' && ISO_DATE.test(clientToday)) return clientToday;
  return new Date().toISOString().split('T')[0];
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

// Only pass genuine user/assistant turns back to the model — never let the
// client inject 'system' messages — and cap their size.
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

// Built per request: a module-level constant would freeze "today" at server start.
const buildSystemPrompt = (today) => `You are an intelligent voice assistant for a task manager app.
Today's date is: ${today}

Always respond with valid JSON only. No extra text, no markdown, just raw JSON.

Response format:
{
  "action": "create" or "create_many" or "update" or "delete" or "read" or "none",
  "payload": {},
  "reply": "Short friendly spoken response.",
  "needs_clarification": false
}

Rules:
- For create: payload has title, scheduled_time (HH:MM), scheduled_date (YYYY-MM-DD)
- For create_many: payload has tasks array
- For update: payload has id and fields to change
- For delete: payload has id and needs_confirmation true
- For read: payload has filter today or tomorrow or morning or afternoon or evening or all
- Always set needs_confirmation true for delete
- Match tasks by meaning not just exact name
- Keep replies short for speaking`;

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { transcript, history = [], today: clientToday } = req.body;
    const userId = req.user.id;
    const today = resolveToday(clientToday);

    if (typeof transcript !== 'string' || transcript.trim() === '') {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    // Read the user's tasks from the database instead of trusting the client copy.
    const tasks = await db.getAllTasks(null, userId);

    const contextMessage = `Current tasks:
${tasks.length === 0 ? 'No tasks yet.' : tasks.map(t =>
  `- ID:${t.id} | "${t.title}" | ${t.scheduled_date || 'no date'} ${t.scheduled_time || 'no time'} | status: ${t.status}`
).join('\n')}

User said: "${transcript}"`;

    const messages = [
      ...sanitizeHistory(history),
      { role: 'user', content: contextMessage }
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(today) },
        ...messages
      ],
    });

    const rawText = response.choices[0].message.content.trim();

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.json({
        action: 'none',
        reply: "Sorry, didn't catch that. Could you say it again?",
        tasks,
      });
    }

    parsed.payload = parsed.payload || {};

    let updatedTasks = tasks;

    try {
      if (parsed.action === 'create') {
        await db.createTask({ scheduled_date: today, ...parsed.payload, user_id: userId });
        updatedTasks = await db.getAllTasks(null, userId);
      } else if (parsed.action === 'create_many') {
        const newTasks = Array.isArray(parsed.payload.tasks) ? parsed.payload.tasks : [];
        for (const task of newTasks) {
          await db.createTask({ scheduled_date: today, ...task, user_id: userId });
        }
        updatedTasks = await db.getAllTasks(null, userId);
      } else if (parsed.action === 'update') {
        const { id, ...fields } = parsed.payload;
        await db.updateTask(id, fields, userId);
        updatedTasks = await db.getAllTasks(null, userId);
      } else if (parsed.action === 'delete') {
        // Never delete straight from the model's output: the client asks the
        // user to confirm and then calls DELETE /api/tasks/:id itself.
        parsed.payload.needs_confirmation = true;
      } else if (parsed.action === 'read') {
        const tomorrow = addDays(today, 1);
        const filter = parsed.payload.filter;
        if (filter === 'today') updatedTasks = await db.getAllTasks(today, userId);
        else if (filter === 'tomorrow') updatedTasks = await db.getAllTasks(tomorrow, userId);
        else updatedTasks = await db.getAllTasks(null, userId);
      }
    } catch (dbError) {
      console.error('DB error:', dbError.message);
      parsed.reply = "Had a problem with that. Please try again.";
    }

    res.json({
      action: parsed.action,
      payload: parsed.payload,
      reply: parsed.reply,
      needs_clarification: parsed.needs_clarification || false,
      tasks: updatedTasks,
      assistantMessage: { role: 'assistant', content: rawText },
      userMessage: { role: 'user', content: contextMessage },
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Something went wrong',
      reply: "Sorry, I am having trouble right now. Please try again.",
    });
  }
});

module.exports = router;