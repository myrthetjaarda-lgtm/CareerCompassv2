import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { letterText } = req.body || {};
  if (!letterText) return res.status(400).json({ error: 'letterText is required' });

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Analyse this reference letter and return JSON only:

{
  "grade": "A or B or C or D or E or F",
  "sentiment": "positive or neutral or mixed or critical",
  "strengthRating": 8,
  "summary": "2-3 sentence assessment",
  "highlights": ["positive point 1", "positive point 2"],
  "concerns": ["concern if any"],
  "recommendation": "Which type of roles this letter works best for"
}

Grade scale: A=Excellent/specific, B=Good, C=Adequate/generic, D=Weak, E=Poor, F=Not usable.
strengthRating: 1-10.

Letter:
${letterText.substring(0, 3000)}`
      }]
    });

    const content = message.content[0]?.text || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse' });
    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
