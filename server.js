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

app.post('/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages) return res.status(400).json({ error: 'Missing messages' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: 'You are a helpful, friendly AI assistant.' },
          ...messages
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