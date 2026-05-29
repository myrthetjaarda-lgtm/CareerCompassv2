import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { letterText, letterPdfBase64 } = req.body || {};
  if (!letterText && !letterPdfBase64) return res.status(400).json({ error: 'letterText or letterPdfBase64 is required' });

  const prompt = `Analyse this reference letter and return ONLY valid JSON with exactly these fields:

{
  "company": "name of the company that issued this letter",
  "employmentFrom": "start date of employment e.g. 2019-03 or March 2019 — null if not found",
  "employmentTo": "end date of employment e.g. 2022-11 or November 2022 — null if not found",
  "companyGrade": "the overall grade or rating the company gave (e.g. 'sehr gut', 'gut', 'excellent', 'outstanding') — null if not explicitly stated",
  "grade": "A, B, C, D, E or F",
  "sentiment": "positive, neutral, mixed or critical",
  "strengthRating": 8,
  "summary": "2-3 sentence assessment",
  "highlights": ["positive point 1", "positive point 2"],
  "concerns": ["concern if any — empty array if none"],
  "recommendation": "Which type of roles this letter works best for",
  "fullText": "the complete verbatim text of the letter, preserving paragraphs with newlines"
}

Grade scale: A=Excellent/specific praise, B=Good, C=Adequate/generic, D=Weak, E=Poor, F=Not usable.
strengthRating: 1-10.
For German letters: "sehr gut" or "stets zu unserer vollsten Zufriedenheit" = A/10. "gut" = B/8. "zufriedenstellend" = C/6.`;

  try {
    const client = new Anthropic({ apiKey });

    let messageContent;
    if (letterPdfBase64) {
      messageContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: letterPdfBase64 },
        },
        { type: 'text', text: prompt },
      ];
    } else {
      messageContent = `${prompt}\n\nLetter:\n${letterText.substring(0, 4000)}`;
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: messageContent }],
    });

    const content = message.content[0]?.text || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse AI response' });
    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
