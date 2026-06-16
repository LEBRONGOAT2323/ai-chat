// AI Chat Proxy Server
// Run: node server.js
// Requires: npm install express cors node-fetch

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Set your Anthropic API key here or via environment variable:
// export ANTHROPIC_API_KEY=sk-ant-...
const API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_API_KEY_HERE';

app.post('/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages) return res.status(400).json({ error: 'Missing messages' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: 'You are a helpful, friendly AI assistant.',
        messages
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    res.json({ reply: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AI Chat running at http://localhost:${PORT}`));