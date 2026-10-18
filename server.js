// CaptionGenius AI - Optional Node.js & Express Backend Server
// Keeps GEMINI_API_KEY secure in server environment variables

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, './')));

// Secure AI Generation Endpoint
app.post('/api/generate', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not defined in server environment or .env file.'
    });
  }

  try {
    const { prompt, platform, language, tone, length, options } = req.body;

    const langName = language === 'sinhala' ? 'Sinhala (සිංහල script)' : language === 'tamil' ? 'Tamil (தமிழ் script)' : 'English';

    const systemPrompt = `You are "CaptionGenius AI", an expert viral social media caption generator for creators in Sri Lanka and worldwide.
Generate 3 distinct, high-converting social media caption variations for ${platform.toUpperCase()}.
Topic: "${prompt}".
Language: ${langName}.
Tone: ${tone}.
Length: ${length}.
Options: Include 3-second hook: ${options?.includeHooks}, Include CTA: ${options?.includeCTA}, Hashtags target: ${options?.hashtagsCount || 12}.

Output ONLY valid JSON without markdown code fences in this EXACT format:
{
  "variations": [
    {
      "badge": "Variation A: Viral & Punchy",
      "hook": "string",
      "body": "string (with natural linebreaks and emojis)",
      "cta": "string",
      "hashtags": ["#tag1", "#tag2", "#tag3"]
    },
    {
      "badge": "Variation B: Storytelling & Relatable",
      "hook": "string",
      "body": "string",
      "cta": "string",
      "hashtags": ["#tag1", "#tag2"]
    },
    {
      "badge": "Variation C: Aesthetic & Tags",
      "hook": "string",
      "body": "string",
      "cta": "string",
      "hashtags": ["#tag1", "#tag2"]
    }
  ]
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const aiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.75,
          topK: 40,
          topP: 0.95
        }
      })
    });

    if (!aiRes.ok) {
      const err = await aiRes.json().catch(() => ({}));
      return res.status(aiRes.status).json({ error: err.error?.message || 'Gemini API Error' });
    }

    const data = await aiRes.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✨ CaptionGenius AI Server running at http://localhost:${PORT}`);
  console.log(`🔒 API keys are kept secure on the backend.`);
});
