const express = require('express');
const router = express.Router();
const db = require('../db/queries');
const Groq = require('groq-sdk');
const authMiddleware = require('../middleware/auth');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an intelligent voice assistant for a task manager app.
Today's date is: ${new Date().toISOString().split('T')[0]}

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
    const { transcript, history = [], tasks = [] } = req.body;
    const userId = req.user.id;

    if (!transcript || transcript.trim() === '') {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    const contextMessage = `Current tasks:
${tasks.length === 0 ? 'No tasks yet.' : tasks.map(t =>
  `- ID:${t.id} | "${t.title}" | ${t.scheduled_date || 'no date'} ${t.scheduled_time || 'no time'} | status: ${t.status}`
).join('\n')}

User said: "${transcript}"`;

    const recentHistory = history.slice(-10);
    const messages = [
      ...recentHistory,
      { role: 'user', content: contextMessage }
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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
        tasks: await db.getAllTasks(null, userId),
      });
    }

    let updatedTasks = tasks;

    try {
      if (parsed.action === 'create') {
        await db.createTask({ ...parsed.payload, user_id: userId });
        updatedTasks = await db.getAllTasks(null, userId);
      } else if (parsed.action === 'create_many') {
        for (const task of parsed.payload.tasks) {
          await db.createTask({ ...task, user_id: userId });
        }
        updatedTasks = await db.getAllTasks(null, userId);
      } else if (parsed.action === 'update') {
        const { id, ...fields } = parsed.payload;
        await db.updateTask(id, fields, userId);
        updatedTasks = await db.getAllTasks(null, userId);
      } else if (parsed.action === 'delete') {
        if (!parsed.payload.needs_confirmation) {
          await db.deleteTask(parsed.payload.id, userId);
          updatedTasks = await db.getAllTasks(null, userId);
        }
      } else if (parsed.action === 'read') {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const filter = parsed.payload && parsed.payload.filter;
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