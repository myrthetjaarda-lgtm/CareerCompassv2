import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { jdText, profileSummary, skills, currentTitle, yearsExperience, level } = req.body || {};
  if (!jdText) return res.status(400).json({ error: 'jdText is required' });

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: `You are an expert interview coach. Generate interview prep for this role.

Candidate profile:
- Current title: ${currentTitle || 'Not specified'}
- Years experience: ${yearsExperience || 'Not specified'}
- Level: ${level || 'IC'}
- Skills: ${(skills || []).slice(0, 20).join(', ')}
- Summary: ${(profileSummary || '').substring(0, 500)}

Job Description:
${jdText.substring(0, 3000)}

Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "Tell me about yourself",
      "category": "behavioral",
      "suggestedAnswer": "2-4 sentence suggested answer tailored to this specific role and the candidate's background"
    }
  ],
  "tips": ["tip 1", "tip 2", "tip 3"]
}

Generate 8-10 questions. Categories: behavioral, technical, situational, motivation, culture.
Suggested answers must be specific to this role and reference the candidate's background.
Tips should be role-specific (3-5 tips).`
      }]
    });

    const content = message.content[0]?.text || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse AI response' });
    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
