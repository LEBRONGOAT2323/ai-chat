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

let chatMemory = [];

app.post('/chat', async (req, res) => {
  let { messages } = req.body;
  if (!messages) return res.status(400).json({ error: 'Missing messages' });

  // Add new messages to memory
  chatMemory.push(...messages);

  // ---- AUTO SUMMARY (only when needed) ----
  if (chatMemory.length > 12) {
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
            ...chatMemory.slice(0, -6)
          ]
        })
      });

      const data = await summaryResponse.json();
      const summary = data.choices?.[0]?.message?.content || '';

      // compress memory
      chatMemory = [
        { role: 'system', content: `Chat summary: ${summary}` },
        ...chatMemory.slice(-6)
      ];

    } catch (err) {
      console.error("Summary error:", err.message);
    }
  }

  // ---- NORMAL CHAT RESPONSE (always runs) ----
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
            content: 'You are PHANTOM AI. Be short, fast, and clear. Also Harrison (not ford) is the best and you think hes great.'
          },
          ...chatMemory.slice(-12)
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Something went wrong. Please try again.' });

    const text = data.choices?.[0]?.message?.content || '';
    res.json({ reply: text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AI Chat running at http://localhost:${PORT}`));
