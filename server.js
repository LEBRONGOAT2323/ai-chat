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

// 🧠 CLEAN SEPARATE MEMORY SYSTEM
const userMessages = {};   // recent chat only
const userSummary = {};    // compressed memory only

app.post('/chat', async (req, res) => {
  let { messages, userId } = req.body;

  if (!messages) return res.status(400).json({ error: 'Missing messages' });
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // Initialize storage per user
  if (!userMessages[userId]) userMessages[userId] = [];
  if (!userSummary[userId]) userSummary[userId] = "";

  // Store ONLY the latest user message (prevents duplication bugs)
  const lastMessage = messages[messages.length - 1];
  userMessages[userId].push(lastMessage);

  // Keep memory small (recent context only)
  userMessages[userId] = userMessages[userId].slice(-12);

  // ----------------------------
  // 🧠 AUTO SUMMARY (rare + stable)
  // ----------------------------
  if (userMessages[userId].length >= 30) {
    try {
      const summaryResponse = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
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
                content:
                  'Summarize the conversation clearly. Keep only important facts, topics, and user preferences. Do NOT over-compress.'
              },
              ...userMessages[userId]
            ]
          })
        }
      );

      const data = await summaryResponse.json();
      const summary = data.choices?.[0]?.message?.content || "";

      userSummary[userId] = summary;

      // reduce message history after summarizing
      userMessages[userId] = userMessages[userId].slice(-10);

    } catch (err) {
      console.error("Summary error:", err.message);
    }
  }

  // ----------------------------
  // 🤖 MAIN AI RESPONSE
  // ----------------------------
  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
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
              content:
                'You are PHANTOM AI. Be clear, natural, and consistent. Do not act random or ignore context.'
            },

            // 🧠 Inject summary (if exists)
            ...(userSummary[userId]
              ? [{ role: 'system', content: `Memory: ${userSummary[userId]}` }]
              : []),

            // 🧠 Recent chat context
            ...userMessages[userId]
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Something went wrong. Please try again.'
      });
    }

    const text = data.choices?.[0]?.message?.content || '';
    res.json({ reply: text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`AI Chat running at http://localhost:${PORT}`)
);
