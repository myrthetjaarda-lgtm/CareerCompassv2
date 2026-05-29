import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it to your Vercel environment variables.' });

  const { cvText, pdfBase64, fileName } = req.body || {};
  if (!cvText && !pdfBase64) return res.status(400).json({ error: 'cvText or pdfBase64 is required' });

  const prompt = `Parse this CV/resume and return a JSON object with exactly these fields. Return ONLY valid JSON, no other text:

{
  "name": "full name",
  "email": "email address or null",
  "phone": "phone number or null",
  "location": "city, country or null",
  "linkedin": "linkedin URL or null",
  "currentTitle": "most recent job title",
  "yearsExperience": number,
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2", ...],
  "languages": [{"language": "English", "level": "C2"}, ...],
  "workExperience": [{"company": "...", "role": "...", "dates": "...", "description": "...", "companyRating": "any performance rating or review grade mentioned e.g. 'exceeds expectations', 'sehr gut', 'outstanding' — null if not mentioned"}],
  "education": [{"school": "...", "degree": "...", "year": "..."}],
  "certifications": [{"name": "...", "issuer": "...", "dateIssued": "...", "renewalDate": null, "status": "active"}],
  "achievements": ["achievement1", ...],
  "level": "IC or Manager or Director"
}

Rules:
- For languages: use CEFR levels (A1-C2) or "Native". Infer from context if not explicit.
- For level: IC = individual contributor, Manager = people manager, Director = senior leader.
- Extract ALL skills mentioned (technical, soft, domain).
- If a field is not found, use null for strings and [] for arrays.
- For email/phone/address: look in the header/contact section of the CV.`;

  try {
    const client = new Anthropic({ apiKey });

    let messageContent;
    if (pdfBase64) {
      messageContent = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBase64,
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ];
    } else {
      messageContent = `${prompt}\n\nCV (${fileName || 'file'}):\n${cvText.substring(0, 10000)}`;
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{ role: 'user', content: messageContent }],
    });

    const content = message.content[0]?.text || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse AI response' });

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('CV parse error:', err);
    return res.status(500).json({ error: err.message || 'Failed to parse CV' });
  }
}
