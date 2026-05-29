import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { jdText, profileSkills = [] } = req.body || {};
  if (!jdText) return res.status(400).json({ error: 'jdText is required' });

  try {
    const client = new Anthropic({ apiKey });
    const profileSkillsList = profileSkills.length ? `\n\nCandidate's skills for matching: ${profileSkills.join(', ')}` : '';

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: `Parse this job description and return a JSON object. Return ONLY valid JSON, no other text:

{
  "company": "company name",
  "role": "job title",
  "location": "city, country or Remote",
  "workSetup": "remote or hybrid or onsite",
  "language": "en or de or fr or other",
  "companyDescription": "1-2 sentence company description",
  "companyStage": "Startup or Scale-up or Established or Enterprise",
  "employeeCount": "estimated headcount like 50-200",
  "reportingLine": "who this role reports to",
  "teamSize": "team size if mentioned",
  "salary": {"min": 0, "max": 0, "currency": "EUR", "period": "annual"},
  "requiredSkills": ["skill1", "skill2"],
  "niceToHaveSkills": ["skill1"],
  "benefits": ["benefit1", "benefit2"],
  "languages": [{"language": "English", "level": "C1"}],
  "matchedSkills": [],
  "transferableSkills": [],
  "skillGaps": [],
  "matchPercent": 0,
  "suggestedQuestions": ["question1", "question2", "question3", "question4", "question5"]
}

For matchedSkills: list skills from the JD that the candidate already has.
For transferableSkills: candidate skills that are relevant but not exact matches.
For skillGaps: JD skills the candidate doesn't have.
For matchPercent: calculate 0-100 based on skills coverage.
If no salary mentioned, use {"min": 0, "max": 0, "currency": "EUR", "period": "annual"}.
Generate 5 smart interview questions relevant to this role.
${profileSkillsList}

Job Description:
${jdText.substring(0, 8000)}`
      }]
    });

    const content = message.content[0]?.text || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse AI response' });

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('JD parse error:', err);
    return res.status(500).json({ error: err.message || 'Failed to parse JD' });
  }
}
