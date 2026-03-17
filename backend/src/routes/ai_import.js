const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { authenticateToken } = require('../middleware/auth');

function getOpenAIClient() {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'YOUR_OPENAI_KEY_HERE') {
        return null;
    }

    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

// POST /api/ai/parse
router.post('/parse', authenticateToken, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'No text provided' });

    const openai = getOpenAIClient();
    if (!openai) {
        return res.status(503).json({ message: 'AI import is not configured on this server' });
    }

    try {
        const prompt = `
            You are a data extraction assistant. I will paste a daily work log WhatsApp message. 
            Extract the following:
            - Date (YYYY-MM-DD)
            - Site Name
            - List of Workers: Name and Hours Worked (number).

            If a start/end time is given (e.g. 7:00 AM - 4:00 PM), calculate the hours (e.g. 9).
            Return ONLY valid JSON in this format:
            {
                "date": "YYYY-MM-DD",
                "site": "Site Name",
                "workers": [
                    { "name": "John Doe", "hours": 8 }
                ]
            }

            Message:
            ${message}
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
        });

        const content = completion.choices[0].message.content;

        // Sanitize response to ensure just JSON
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        const jsonStr = content.substring(jsonStart, jsonEnd + 1);

        const parsedData = JSON.parse(jsonStr);
        res.json(parsedData);

    } catch (err) {
        console.error('OpenAI Error:', err);
        res.status(500).json({
            message: 'AI Parsing Failed',
            error: err.message
        });
    }
});

module.exports = router;
