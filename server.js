// AI Chat Proxy Server using Groq
// Run: node server.js
// Requires: npm install express cors

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const API_KEY = process.env.GROQ_API_KEY || 'YOUR_GROQ_API_KEY_HERE';

// 🧠 PER-USER MEMORY (FIX)
const userMemory = {};

app.post('/chat', async (req, res) => {
  let { messages, userId } = req.body;

  if (!messages) return res.status(400).json({ error: 'Missing messages' });
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // Create memory for new users
  if (!userMemory[userId]) {
    userMemory[userId] = [];
  }

  // Add new messages to that user's memory
  userMemory[userId].push(...messages);

  // ---- AUTO SUMMARY (per user) ----
  if (userMemory[userId].length > 12) {
    try {
      const summaryResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 200,
          messages: [
            {
              role: 'system',
              content: 'Summarize this chat into a short memory of key facts.'
            },
            ...userMemory[userId].slice(0, -6)
          ]
        })
      });

      const data = await summaryResponse.json();
      const summary = data.choices?.[0]?.message?.content || '';

      // compress memory for THIS USER ONLY
      userMemory[userId] = [
        { role: 'system', content: `Chat summary: ${summary}` },
        ...userMemory[userId].slice(-6)
      ];

    } catch (err) {
      console.error("Summary error:", err.message);
    }
  }

  // ---- NORMAL CHAT RESPONSE ----
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 256,
        messages: [
          {
            role: 'system',
            content: 'You are PHANTOM AI. Be short, fast, and clear.'
          },
          ...userMemory[userId].slice(-12)
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Something went wrong. Please try again.' });
    }

    const text = data.choices?.[0]?.message?.content || '';
    res.json({ reply: text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AI Chat running at http://localhost:${PORT}`));
