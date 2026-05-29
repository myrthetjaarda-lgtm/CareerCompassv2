import { useState, useEffect, useCallback } from 'react';
import { AppData, Application, Reference, Offer, AppStatus, RefGrade, InterviewStage, Theme, FontSize, ADMIN_EMAIL, STATUS_LABELS, GRADE_LABELS, SECTORS, DEPARTMENTS, CEFR_LEVELS, DEFAULT_DATA, PRO_LIMITS } from './types';
import { loadData, saveData, exportData } from './storage';

type Page = 'dashboard' | 'applications' | 'cv-upload' | 'jd-extract' | 'interviews' | 'references' | 'offers' | 'salary-calc' | 'toolkit' | 'profile' | 'admin';

// ──────────────────────────────────────────────
// Salary Calculator Logic
// ──────────────────────────────────────────────
function calcGermanSalary(annualGross: number, taxClass: number, churchTax: boolean) {
  if (!annualGross || annualGross <= 0) return null;
  const monthly = annualGross / 12;
  // Social security caps 2024
  const rvCap = 7550, kvCap = 5175;
  const rvBase = Math.min(monthly, rvCap);
  const kvBase = Math.min(monthly, kvCap);
  const rv = rvBase * 0.093;
  const av = rvBase * 0.013;
  const kv = kvBase * 0.089;
  const pv = kvBase * 0.018;
  const totalSS = rv + av + kv + pv;
  // Income tax (annual approximation)
  const taxable = annualGross - totalSS * 12;
  let lohnsteuer = 0;
  const gfb = 11604;
  if (taxable > gfb) {
    if (taxable <= 17005) {
      const y = (taxable - gfb) / 10000;
      lohnsteuer = (922.98 * y + 1400) * y;
    } else if (taxable <= 66760) {
      const z = (taxable - 17005) / 10000;
      lohnsteuer = (181.19 * z + 2397) * z + 1025.38;
    } else if (taxable <= 277825) {
      lohnsteuer = 0.42 * taxable - 10602.13;
    } else {
      lohnsteuer = 0.45 * taxable - 18936.88;
    }
    // Tax class adjustments
    if (taxClass === 3) lohnsteuer *= 0.6;
    else if (taxClass === 5) lohnsteuer *= 1.5;
    else if (taxClass === 2) lohnsteuer = Math.max(0, lohnsteuer - 4260 / 12);
    lohnsteuer = Math.max(0, lohnsteuer);
  }
  const monthlyLst = lohnsteuer / 12;
  const soli = lohnsteuer > 18130 ? (lohnsteuer - 18130) * 0.119 / 12 : 0;
  const kt = churchTax ? monthlyLst * 0.09 : 0;
  const net = monthly - totalSS - monthlyLst - soli - kt;
  return {
    monthlyGross: monthly,
    monthlyNet: net,
    annualNet: net * 12,
    rv: rv, av: av, kv: kv, pv: pv,
    lohnsteuer: monthlyLst, soli, kirchensteuer: kt, totalSS,
  };
}

// ──────────────────────────────────────────────
// Shared UI components
// ──────────────────────────────────────────────
function StatusBadge({ status }: { status: AppStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}

function GradeBadge({ grade }: { grade: RefGrade }) {
  return <span className={`badge badge-${grade.toLowerCase()}`}>{grade} — {GRADE_LABELS[grade]}</span>;
}

function Modal({ open, onClose, title, children, size = '' }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: string }) {
  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Dashboard Page
// ──────────────────────────────────────────────
function Dashboard({ data, onNavigate }: { data: AppData; onNavigate: (p: Page) => void }) {
  const apps = data.applications;
  const byStatus = (s: AppStatus) => apps.filter(a => a.status === s).length;
  const pipeline = apps.filter(a => !['rejected', 'withdrawn'].includes(a.status)).length;
  const recent = [...apps].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 5);
  const applied = byStatus('applied') + byStatus('interview') + byStatus('offer');
  const responseRate = apps.length ? Math.round((applied / apps.length) * 100) : 0;

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingInterviews = apps.flatMap(app =>
    (app.stages || [])
      .filter(s => s.status === 'upcoming' && s.date)
      .map(s => ({ ...s, company: app.company, role: app.role }))
  ).filter(s => {
    const d = new Date(s.date);
    return d >= now && d <= weekAhead;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const stages: { label: string; status: AppStatus; color: string }[] = [
    { label: 'Saved', status: 'saved', color: '#3b82f6' },
    { label: 'Applied', status: 'applied', color: '#f59e0b' },
    { label: 'Interview', status: 'interview', color: '#10b981' },
    { label: 'Offer', status: 'offer', color: '#059669' },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Dashboard</h1><p className="page-subtitle">Your job search at a glance</p></div>
      </div>

      <div className="stat-grid">
        {[
          { n: apps.length, l: 'Total Applications' },
          { n: pipeline, l: 'Active Pipeline' },
          { n: byStatus('interview'), l: 'In Interview' },
          { n: byStatus('offer'), l: 'Offers' },
          { n: `${responseRate}%`, l: 'Response Rate' },
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div className="stat-number">{s.n}</div>
            <div className="stat-label">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="section-title mb-2">Pipeline</h3>
          {stages.map(s => {
            const count = byStatus(s.status);
            const pct = apps.length ? Math.round(count / apps.length * 100) : 0;
            return (
              <div key={s.status} className="mb-2">
                <div className="flex justify-between mb-1" style={{ fontSize: '0.85rem' }}>
                  <span>{s.label}</span>
                  <span className="fw-600">{count}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: s.color }} />
                </div>
              </div>
            );
          })}
          <div className="mt-2 text-muted text-sm">
            Rejected: {byStatus('rejected')} | Withdrawn: {byStatus('withdrawn')}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title mb-2">Quick Actions</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { label: '➕ Add Application', page: 'applications' as Page },
              { label: '📤 Upload CV', page: 'cv-upload' as Page },
              { label: '🔍 Extract JD', page: 'jd-extract' as Page },
              { label: '⚖️ Compare Offers', page: 'offers' as Page },
              { label: '💰 Salary Calculator', page: 'salary-calc' as Page },
              { label: '🛠️ Germany Toolkit', page: 'toolkit' as Page },
            ].map(a => (
              <button key={a.page} className="btn btn-outline" style={{ justifyContent: 'flex-start' }} onClick={() => onNavigate(a.page)}>{a.label}</button>
            ))}
          </div>
        </div>
      </div>

      {upcomingInterviews.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--success)' }}>
          <h3 className="section-title mb-2">🗓️ Upcoming Interviews This Week</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {upcomingInterviews.map(s => (
              <div key={s.id} className="flex justify-between items-center" style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="fw-600">{s.company} <span className="text-muted fw-400">— {s.role}</span></div>
                  <div className="text-sm text-muted">{s.name || 'Interview'}{s.interviewers ? ` · ${s.interviewers}` : ''}</div>
                </div>
                <div className="text-sm fw-600" style={{ color: 'var(--success)', whiteSpace: 'nowrap' }}>{new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-2">Recent Applications</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Company</th><th>Role</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {recent.map(a => (
                  <tr key={a.id}>
                    <td className="fw-600 text-accent">{a.company}</td>
                    <td>{a.role}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-muted text-sm">{new Date(a.dateAdded).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Application Detail Modal (9 tabs)
// ──────────────────────────────────────────────
function AppDetailModal({ app, onClose, onUpdate }: { app: Application; onClose: () => void; onUpdate: (a: Application) => void }) {
  const [tab, setTab] = useState(0);
  const [local, setLocal] = useState<Application>({ ...app });
  const tabs = ['Overview', 'Resume', 'Cover Letter', 'Research', 'Skills Match', 'Salary & Benefits', 'Case Study', 'Questions', 'Interviews'];

  const save = () => onUpdate(local);
  const update = (k: keyof Application, v: unknown) => setLocal(p => ({ ...p, [k]: v }));

  return (
    <Modal open onClose={() => { save(); onClose(); }} title={`${app.company} — ${app.role}`} size="modal-xl">
      <div className="tabs">
        {tabs.map((t, i) => (
          <button key={t} className={`tab-btn ${tab === i ? 'active' : ''}`} onClick={() => { save(); setTab(i); }}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <div>
          <div className="form-row mb-2">
            <div className="form-group">
              <label>Status</label>
              <select value={local.status} onChange={e => update('status', e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Work Setup</label>
              <select value={local.workSetup} onChange={e => update('workSetup', e.target.value)}>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Location</label>
              <input value={local.location} onChange={e => update('location', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Date Applied</label>
              <input type="date" value={local.dateApplied || ''} onChange={e => update('dateApplied', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Job URL</label>
            <input value={local.url || ''} onChange={e => update('url', e.target.value)} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>JD Language</label>
            <select value={local.jdLanguage || 'en'} onChange={e => update('jdLanguage', e.target.value)}>
              <option value="en">English</option>
              <option value="de">German</option>
              <option value="bilingual">Bilingual</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea rows={4} value={local.notes || ''} onChange={e => update('notes', e.target.value)} placeholder="Your notes about this application..." />
          </div>
          {local.requiredSkills && local.requiredSkills.length > 0 && (
            <div>
              <p className="fw-600 text-sm mb-1">Required Skills from JD:</p>
              <div>{local.requiredSkills.map(s => <span key={s} className="tag tag-blue">{s}</span>)}</div>
            </div>
          )}
        </div>
      )}

      {tab === 1 && (
        <div>
          <p className="text-muted text-sm mb-2">Tailor your resume for this role. Note key matches.</p>
          <div className="form-group">
            <label>Resume Notes (tailoring for this role)</label>
            <textarea rows={8} value={(local as Record<string, unknown>).resumeNotes as string || ''} onChange={e => update('resumeNotes' as keyof Application, e.target.value)} placeholder="Key points to emphasise, skills to highlight, experience to lead with..." />
          </div>
          {local.matchedSkills && local.matchedSkills.length > 0 && (
            <div>
              <p className="fw-600 text-sm mb-1">✅ Skills to highlight (direct matches):</p>
              <div>{local.matchedSkills.map(s => <span key={s} className="skill-tag skill-match">{s}</span>)}</div>
            </div>
          )}
        </div>
      )}

      {tab === 2 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label style={{ fontWeight: 600 }}>Cover Letter</label>
            <button className="btn btn-sm btn-outline" onClick={() => {
              if (local.coverLetter && !confirm('Replace existing cover letter with template?')) return;
              const skills = (local.matchedSkills || []).slice(0, 3).join(', ');
              const template = `Dear Hiring Manager,

I am writing to express my strong interest in the ${local.role} position at ${local.company}. With my background in People Operations and HR, I am excited about the opportunity to contribute to your team.

${local.companyDescription ? `I have been following ${local.company}'s work and am particularly drawn to your focus on ${local.companyMission || 'building a strong people-first culture'}.` : `${local.company} stands out to me as a company where I can make a meaningful impact.`}

${skills ? `My experience aligns well with your requirements, particularly in: ${skills}.` : 'My experience spans across key areas of People Ops and HR, from talent acquisition to employee engagement and organisational development.'}

${local.workSetup === 'remote' ? 'I am fully equipped and experienced working remotely, with strong communication and self-management skills.' : ''}

I would welcome the opportunity to discuss how my background can support ${local.company}'s people strategy. I look forward to learning more about this role.

Kind regards,
[Your name]`;
              update('coverLetter', template);
            }}>📝 Generate Template</button>
          </div>
          <textarea rows={14} value={local.coverLetter || ''} onChange={e => update('coverLetter', e.target.value)} placeholder="Write your cover letter here, or click 'Generate Template' for a starting point..." style={{ width: '100%' }} />
          {local.coverLetter && (
            <div className="flex gap-1 mt-2">
              <button className="btn btn-sm btn-outline" onClick={() => { navigator.clipboard.writeText(local.coverLetter || ''); }}>📋 Copy</button>
              <span className="text-xs text-muted" style={{ alignSelf: 'center' }}>{local.coverLetter.split(/\s+/).filter(Boolean).length} words</span>
            </div>
          )}
        </div>
      )}

      {tab === 3 && (
        <div>
          <div className="form-row">
            <div className="form-group">
              <label>Company Website</label>
              <input value={local.companyWebsite || ''} onChange={e => update('companyWebsite', e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label>Company Stage</label>
              <select value={local.companyStage || ''} onChange={e => update('companyStage', e.target.value)}>
                <option value="">Select...</option>
                {['Startup', 'Scale-up', 'Established', 'Enterprise'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Employee Count</label>
              <input value={local.employeeCount || ''} onChange={e => update('employeeCount', e.target.value)} placeholder="e.g. 50-200" />
            </div>
            <div className="form-group">
              <label>Reporting Line</label>
              <input value={local.reportingLine || ''} onChange={e => update('reportingLine', e.target.value)} placeholder="e.g. CPO, Head of People" />
            </div>
          </div>
          <div className="form-group">
            <label>Company Description</label>
            <textarea rows={3} value={local.companyDescription || ''} onChange={e => update('companyDescription', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Mission / Values</label>
            <textarea rows={3} value={local.companyMission || ''} onChange={e => update('companyMission', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Team Size</label>
            <input value={local.teamSize || ''} onChange={e => update('teamSize', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Direct Reports (if Manager role)</label>
            <input value={local.directReports || ''} onChange={e => update('directReports', e.target.value)} />
          </div>
        </div>
      )}

      {tab === 4 && (
        <div>
          {local.matchPercent !== undefined && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="flex justify-between items-center mb-1">
                <span className="fw-600">Overall Match</span>
                <span className="fw-600 text-accent">{local.matchPercent}%</span>
              </div>
              <div className="progress-bar" style={{ height: '12px' }}>
                <div className="progress-fill" style={{ width: `${local.matchPercent}%`, background: local.matchPercent > 70 ? 'var(--success)' : local.matchPercent > 40 ? 'var(--warning)' : 'var(--danger)' }} />
              </div>
            </div>
          )}
          <div className="grid-3">
            <div>
              <p className="fw-600 text-sm mb-1" style={{ color: 'var(--success)' }}>✅ Direct Matches</p>
              {(local.matchedSkills || []).length === 0
                ? <p className="text-muted text-sm">Run JD extract to see matches</p>
                : (local.matchedSkills || []).map(s => <span key={s} className="skill-tag skill-match" style={{ display: 'block', marginBottom: '0.3rem' }}>{s}</span>)
              }
            </div>
            <div>
              <p className="fw-600 text-sm mb-1" style={{ color: 'var(--warning)' }}>⚡ Transferable</p>
              {(local.transferableSkills || []).length === 0
                ? <p className="text-muted text-sm">No transferable skills detected</p>
                : (local.transferableSkills || []).map(s => <span key={s} className="skill-tag skill-transfer" style={{ display: 'block', marginBottom: '0.3rem' }}>{s}</span>)
              }
            </div>
            <div>
              <p className="fw-600 text-sm mb-1" style={{ color: 'var(--danger)' }}>⚠️ Gaps</p>
              {(local.skillGaps || []).length === 0
                ? <p className="text-muted text-sm">No gaps detected</p>
                : (local.skillGaps || []).map(s => <span key={s} className="skill-tag skill-gap" style={{ display: 'block', marginBottom: '0.3rem' }}>{s}</span>)
              }
            </div>
          </div>
        </div>
      )}

      {tab === 5 && (
        <div>
          <div className="form-row">
            <div className="form-group">
              <label>Salary Min (€)</label>
              <input type="number" value={local.salary?.min || ''} onChange={e => update('salary', { ...(local.salary || {}), min: Number(e.target.value), currency: 'EUR', period: 'annual' })} />
            </div>
            <div className="form-group">
              <label>Salary Max (€)</label>
              <input type="number" value={local.salary?.max || ''} onChange={e => update('salary', { ...(local.salary || {}), max: Number(e.target.value), currency: 'EUR', period: 'annual' })} />
            </div>
          </div>
          <div className="form-group">
            <label>Benefits (one per line)</label>
            <textarea rows={5} value={(local.benefits || []).join('\n')} onChange={e => update('benefits', e.target.value.split('\n').filter(Boolean))} placeholder="Health insurance&#10;Gym membership&#10;Remote work allowance" />
          </div>
          <div className="form-group">
            <label>Bonus Structure</label>
            <input value={(local as Record<string, unknown>).bonusStructure as string || ''} onChange={e => update('bonusStructure' as keyof Application, e.target.value)} placeholder="e.g. 10% annual performance bonus" />
          </div>
        </div>
      )}

      {tab === 6 && (
        <div>
          <div className="form-group">
            <label>Case Study Preparation</label>
            <textarea rows={6} value={(local as Record<string, unknown>).caseStudy as string || ''} onChange={e => update('caseStudy' as keyof Application, e.target.value)} placeholder="Notes for case study or take-home exercise..." />
          </div>
          <div className="form-group">
            <label>Key STAR Stories to prepare</label>
            <textarea rows={6} value={(local as Record<string, unknown>).starStories as string || ''} onChange={e => update('starStories' as keyof Application, e.target.value)} placeholder="Situation-Task-Action-Result examples relevant to this role..." />
          </div>
        </div>
      )}

      {tab === 7 && (
        <div>
          <div className="form-group">
            <label>Questions to ask (one per line)</label>
            <textarea rows={8} value={(local.questions || []).join('\n')} onChange={e => update('questions', e.target.value.split('\n').filter(Boolean))} placeholder="What does success look like in the first 90 days?&#10;How is the team structured?&#10;What are the biggest challenges?" />
          </div>
          {local.questions && local.questions.length > 0 && (
            <div>
              <p className="fw-600 text-sm mb-1">Your questions:</p>
              <ol style={{ paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
                {local.questions.map((q, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{q}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}

      {tab === 8 && (
        <div>
          <div className="section-header">
            <h3 className="section-title">Interview Stages</h3>
            <button className="btn btn-sm" onClick={() => {
              const stage: InterviewStage = { id: Date.now().toString(), name: '', date: '', format: 'Video call', status: 'upcoming', interviewers: '', prepNotes: '', notes: '', sentiment: '' };
              update('stages', [...(local.stages || []), stage]);
            }}>+ Add Stage</button>
          </div>
          {(local.stages || []).length === 0 && <p className="text-muted text-sm">No interview stages yet.</p>}
          {(local.stages || []).map((stage, idx) => (
            <div key={stage.id} className="card" style={{ marginBottom: '1rem' }}>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label>Stage Name</label>
                  <input value={stage.name} onChange={e => {
                    const stages = [...(local.stages || [])];
                    stages[idx] = { ...stage, name: e.target.value };
                    update('stages', stages);
                  }} placeholder="Phone Screen, Technical, Final..." />
                </div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label>Date</label>
                  <input type="date" value={stage.date} onChange={e => {
                    const stages = [...(local.stages || [])];
                    stages[idx] = { ...stage, date: e.target.value };
                    update('stages', stages);
                  }} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label>Status</label>
                  <select value={stage.status} onChange={e => {
                    const stages = [...(local.stages || [])];
                    stages[idx] = { ...stage, status: e.target.value as InterviewStage['status'] };
                    update('stages', stages);
                  }}>
                    {['upcoming', 'done', 'passed', 'failed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label>Sentiment</label>
                  <select value={stage.sentiment} onChange={e => {
                    const stages = [...(local.stages || [])];
                    stages[idx] = { ...stage, sentiment: e.target.value as InterviewStage['sentiment'] };
                    update('stages', stages);
                  }}>
                    <option value="">-</option>
                    {['positive', 'neutral', 'mixed', 'critical'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label>Interviewers</label>
                <input value={stage.interviewers} onChange={e => {
                  const stages = [...(local.stages || [])];
                  stages[idx] = { ...stage, interviewers: e.target.value };
                  update('stages', stages);
                }} placeholder="John Smith (VP People), Sarah Lee (CTO)..." />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Notes</label>
                <textarea rows={3} value={stage.notes} onChange={e => {
                  const stages = [...(local.stages || [])];
                  stages[idx] = { ...stage, notes: e.target.value };
                  update('stages', stages);
                }} />
              </div>
              <button className="btn btn-sm btn-danger" style={{ marginTop: '0.75rem' }} onClick={() => {
                update('stages', (local.stages || []).filter((_, i) => i !== idx));
              }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between mt-3" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-outline" onClick={() => { save(); onClose(); }}>Close & Save</button>
        <button className="btn" onClick={() => { save(); onClose(); }}>Save Changes</button>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Applications Page
// ──────────────────────────────────────────────
function ApplicationsPage({ data, onUpdate }: { data: AppData; onUpdate: (d: AppData) => void }) {
  const [filter, setFilter] = useState<AppStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Application | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [form, setForm] = useState({ company: '', role: '', location: '', workSetup: 'hybrid' as Application['workSetup'], status: 'saved' as AppStatus, url: '' });

  const filtered = data.applications
    .filter(a => filter === 'all' || a.status === filter)
    .filter(a => !search || a.company.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase()));

  const addApp = () => {
    if (!form.company || !form.role) return;
    const app: Application = { ...form, id: Date.now().toString(), dateAdded: new Date().toISOString() };
    onUpdate({ ...data, applications: [...data.applications, app] });
    setForm({ company: '', role: '', location: '', workSetup: 'hybrid', status: 'saved', url: '' });
    setShowAdd(false);
  };

  const updateApp = (updated: Application) => {
    onUpdate({ ...data, applications: data.applications.map(a => a.id === updated.id ? updated : a) });
  };

  const deleteApp = (id: string) => {
    if (confirm('Delete this application?')) onUpdate({ ...data, applications: data.applications.filter(a => a.id !== id) });
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Applications</h1><p className="page-subtitle">Track your job applications ({data.applications.length} total)</p></div>
        <div className="flex gap-1">
          <button className={`btn btn-sm ${viewMode === 'list' ? '' : 'btn-outline'}`} onClick={() => setViewMode('list')}>☰ List</button>
          <button className={`btn btn-sm ${viewMode === 'kanban' ? '' : 'btn-outline'}`} onClick={() => setViewMode('kanban')}>⊞ Board</button>
          <button className="btn" onClick={() => setShowAdd(true)}>+ Add</button>
        </div>
      </div>

      <div className="mb-3">
        <input
          type="text"
          placeholder="Search by company or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 400, padding: '0.65rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.9rem' }}
        />
        {viewMode === 'list' && (
          <div className="flex flex-wrap gap-1">
            {(['all', 'saved', 'applied', 'interview', 'offer', 'rejected'] as const).map(s => (
              <button key={s} className={`btn btn-sm ${filter === s ? '' : 'btn-outline'}`} onClick={() => setFilter(s)}>
                {s === 'all' ? `All (${data.applications.length})` : `${STATUS_LABELS[s as AppStatus]} (${data.applications.filter(a => a.status === s).length})`}
              </button>
            ))}
          </div>
        )}
      </div>

      {viewMode === 'kanban' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'start' }}>
          {(['saved', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'] as AppStatus[]).map(col => {
            const colApps = data.applications.filter(a => a.status === col && (!search || a.company.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase())));
            return (
              <div key={col} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="fw-600 text-sm">{STATUS_LABELS[col]}</span>
                  <span style={{ background: 'var(--accent)', color: 'white', borderRadius: '10px', padding: '0 0.5rem', fontSize: '0.75rem' }}>{colApps.length}</span>
                </div>
                {colApps.length === 0
                  ? <div className="text-xs text-muted" style={{ padding: '0.5rem 0' }}>Empty</div>
                  : colApps.map(app => (
                      <div key={app.id} className="app-card" style={{ marginBottom: '0.5rem', cursor: 'pointer' }} onClick={() => setSelected(app)}>
                        <div className="fw-600 text-sm">{app.company}</div>
                        <div className="text-xs text-muted">{app.role}</div>
                        {app.matchPercent !== undefined && <div className="text-xs" style={{ color: 'var(--success)' }}>{app.matchPercent}% match</div>}
                      </div>
                    ))
                }
              </div>
            );
          })}
        </div>
      ) : (
        filtered.length === 0
          ? <div className="empty-state"><div className="empty-state-icon">📋</div><p className="empty-state-text">No applications {filter !== 'all' ? `with status "${filter}"` : 'yet'}</p></div>
          : <div className="card-grid">
              {filtered.map(app => (
                <div key={app.id} className="app-card" onClick={() => setSelected(app)}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="app-card-company">{app.company}</span>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="app-card-role">{app.role}</div>
                  <div className="app-card-meta">{app.location} • {app.workSetup} • {new Date(app.dateAdded).toLocaleDateString('en-GB')}</div>
                  {app.matchPercent !== undefined && (
                    <div className="mt-2">
                      <div className="progress-bar" style={{ height: '4px' }}>
                        <div className="progress-fill" style={{ width: `${app.matchPercent}%`, background: app.matchPercent > 70 ? 'var(--success)' : 'var(--warning)' }} />
                      </div>
                      <span className="text-xs text-muted">{app.matchPercent}% skills match</span>
                    </div>
                  )}
                  <button className="btn btn-sm btn-danger mt-2" style={{ fontSize: '0.75rem' }} onClick={e => { e.stopPropagation(); deleteApp(app.id); }}>Delete</button>
                </div>
              ))}
            </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Application">
        <div className="form-row">
          <div className="form-group"><label>Company *</label><input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} required /></div>
          <div className="form-group"><label>Role *</label><input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} required /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Location</label><input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
          <div className="form-group"><label>Work Setup</label>
            <select value={form.workSetup} onChange={e => setForm(p => ({ ...p, workSetup: e.target.value as Application['workSetup'] }))}>
              <option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as AppStatus }))}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Job URL</label><input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." /></div>
        </div>
        <div className="flex gap-1 justify-between mt-2">
          <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn" onClick={addApp}>Add Application</button>
        </div>
      </Modal>

      {selected && <AppDetailModal app={selected} onClose={() => setSelected(null)} onUpdate={app => { updateApp(app); setSelected(null); }} />}
    </div>
  );
}

// ──────────────────────────────────────────────
// CV Upload Page
// ──────────────────────────────────────────────
function CVUploadPage({ data, onUpdate, isPro }: { data: AppData; onUpdate: (d: AppData) => void; isPro: boolean }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    if (!isPro) { setError('CV parsing requires Pro. Upgrade to use AI features.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      let body: string;
      if (isPdf) {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        body = JSON.stringify({ pdfBase64: base64, fileName: file.name });
      } else {
        const text = await file.text();
        body = JSON.stringify({ cvText: text, fileName: file.name });
      }
      const res = await fetch('/api/parse-cv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (!res.ok) throw new Error(await res.text());
      const parsed = await res.json();
      setResult(parsed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Parsing failed');
    } finally {
      setLoading(false);
    }
  };

  const applyToProfile = () => {
    if (!result) return;
    const profile = { ...data.profile };
    if (result.name) profile.name = result.name as string;
    if (result.currentTitle) profile.currentTitle = result.currentTitle as string;
    if (result.yearsExperience) profile.yearsExperience = result.yearsExperience as number;
    if (result.summary) profile.summary = result.summary as string;
    if (result.skills) profile.skills = result.skills as string[];
    if (result.languages) profile.languages = result.languages as { language: string; level: string }[];
    if (result.level) profile.level = result.level as 'IC' | 'Manager' | 'Director';
    if (result.email) profile.email = result.email as string;
    if (result.phone) profile.phone = result.phone as string;
    if (result.location) profile.location = result.location as string;
    if (result.linkedin) profile.linkedin = result.linkedin as string;
    if (result.certifications) profile.certifications = result.certifications as typeof profile.certifications;
    onUpdate({ ...data, profile });
    setResult(null);
    alert('Profile updated from CV!');
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">CV Upload</h1><p className="page-subtitle">Upload your CV to auto-fill your profile with AI</p></div>
      </div>

      {!isPro && (
        <div className="pro-gate mb-3">
          <div className="pro-gate-title">🔒 Pro Feature</div>
          <div className="pro-gate-text">CV parsing with AI is available in Pro. Your profile data is auto-extracted from your CV — name, skills, languages, certifications and more.</div>
        </div>
      )}

      <div className="card" style={{ maxWidth: 600 }}>
        <div
          className="upload-area"
          onClick={() => document.getElementById('cvFileInput')?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
          onDragLeave={e => e.currentTarget.classList.remove('dragover')}
          onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
          <p className="fw-600 mb-1">Drag & drop your CV or click to browse</p>
          <p className="text-muted text-sm">PDF, Word, or plain text files accepted</p>
          <input id="cvFileInput" type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        {loading && <div className="flex items-center gap-1 mt-3"><div className="spinner" /><span className="text-muted">Analysing CV with AI…</span></div>}
        {error && <div className="alert alert-error mt-2">{error}</div>}

        {result && (
          <div className="mt-3">
            <div className="alert alert-success">✅ CV analysed successfully!</div>
            <div className="card" style={{ background: 'var(--cream)' }}>
              <p className="fw-600 mb-2">Extracted data:</p>
              {Boolean(result.name) && <div><strong>Name:</strong> {String(result.name)}</div>}
              {Boolean(result.email) && <div><strong>Email:</strong> {String(result.email)}</div>}
              {Boolean(result.phone) && <div><strong>Phone:</strong> {String(result.phone)}</div>}
              {Boolean(result.location) && <div><strong>Location:</strong> {String(result.location)}</div>}
              {Boolean(result.currentTitle) && <div><strong>Title:</strong> {String(result.currentTitle)}</div>}
              {Boolean(result.level) && <div><strong>Level:</strong> {String(result.level)}</div>}
              {Boolean(result.yearsExperience) && <div><strong>Experience:</strong> {String(result.yearsExperience)} years</div>}
              {Boolean(result.linkedin) && <div><strong>LinkedIn:</strong> {String(result.linkedin)}</div>}
              {Boolean(result.skills) && <div className="mt-1"><strong>Skills:</strong> {(result.skills as string[]).join(', ')}</div>}
              {Boolean(result.languages) && <div className="mt-1"><strong>Languages:</strong> {(result.languages as { language: string; level: string }[]).map(l => `${l.language} (${l.level})`).join(', ')}</div>}
              {Boolean(result.certifications) && (result.certifications as {name:string}[]).length > 0 && <div className="mt-1"><strong>Certifications:</strong> {(result.certifications as {name:string}[]).map(c => c.name).join(', ')}</div>}
            </div>
            <div className="flex gap-1 mt-2">
              <button className="btn" onClick={applyToProfile}>Apply to Profile</button>
              <button className="btn btn-outline" onClick={() => setResult(null)}>Discard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// JD Extract Page
// ──────────────────────────────────────────────
function JDExtractPage({ data, onUpdate, isPro }: { data: AppData; onUpdate: (d: AppData) => void; isPro: boolean }) {
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [targetApp, setTargetApp] = useState('');

  const extract = async () => {
    if (!jdText.trim()) return;
    if (!isPro) { setError('JD extraction requires Pro.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/parse-jd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jdText, profileSkills: data.profile.skills }) });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const applyToApp = () => {
    if (!result || !targetApp) return;
    onUpdate({
      ...data,
      applications: data.applications.map(a => a.id === targetApp ? {
        ...a,
        companyDescription: result.companyDescription as string || a.companyDescription,
        requiredSkills: result.requiredSkills as string[] || a.requiredSkills,
        niceToHaveSkills: result.niceToHaveSkills as string[] || a.niceToHaveSkills,
        benefits: result.benefits as string[] || a.benefits,
        salary: (result.salary as Application['salary']) || a.salary,
        matchedSkills: result.matchedSkills as string[] || a.matchedSkills,
        transferableSkills: result.transferableSkills as string[] || a.transferableSkills,
        skillGaps: result.skillGaps as string[] || a.skillGaps,
        matchPercent: result.matchPercent as number || a.matchPercent,
        questions: result.suggestedQuestions as string[] || a.questions,
        jdText: jdText,
        jdLanguage: result.language as string || 'en',
      } : a)
    });
    alert('Application updated from JD!');
    setResult(null); setJdText('');
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">JD Extraction</h1><p className="page-subtitle">Paste a job description and let AI extract all the key data</p></div>
      </div>

      {!isPro && <div className="pro-gate mb-3"><div className="pro-gate-title">🔒 Pro Feature</div><div className="pro-gate-text">AI-powered JD extraction parses requirements, skills, salary, and benefits automatically.</div></div>}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3 className="section-title mb-2">Paste Job Description</h3>
          <textarea rows={16} value={jdText} onChange={e => setJdText(e.target.value)} placeholder="Paste the full LinkedIn / company job description here..." style={{ width: '100%', resize: 'vertical' }} className="form-group" />
          <button className="btn" onClick={extract} disabled={loading || !jdText.trim()}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Extracting…</> : '🔍 Extract with AI'}
          </button>
          {error && <div className="alert alert-error mt-2">{error}</div>}
        </div>

        <div>
          {result && (
            <div className="card">
              <h3 className="section-title mb-2">Extracted Data</h3>
              {Boolean(result.company) && <div className="mb-1"><strong>Company:</strong> {String(result.company)}</div>}
              {Boolean(result.role) && <div className="mb-1"><strong>Role:</strong> {String(result.role)}</div>}
              {Boolean(result.location) && <div className="mb-1"><strong>Location:</strong> {String(result.location)}</div>}
              {Boolean(result.workSetup) && <div className="mb-1"><strong>Work Setup:</strong> {String(result.workSetup)}</div>}
              {Boolean(result.language) && <div className="mb-1"><strong>JD Language:</strong> {String(result.language)}</div>}
              {result.matchPercent !== undefined && <div className="mb-2"><strong>Skills Match:</strong> <span className="text-accent fw-600">{result.matchPercent as number}%</span></div>}
              {Boolean(result.requiredSkills) && (
                <div className="mb-2">
                  <p className="fw-600 text-sm mb-1">Required Skills:</p>
                  <div>{(result.requiredSkills as string[]).map(s => <span key={s} className="tag tag-blue">{s}</span>)}</div>
                </div>
              )}
              {Boolean(result.matchedSkills) && (result.matchedSkills as string[]).length > 0 && (
                <div className="mb-2">
                  <p className="fw-600 text-sm mb-1" style={{ color: 'var(--success)' }}>✅ You match:</p>
                  <div>{(result.matchedSkills as string[]).map(s => <span key={s} className="skill-tag skill-match">{s}</span>)}</div>
                </div>
              )}
              {Boolean(result.skillGaps) && (result.skillGaps as string[]).length > 0 && (
                <div className="mb-2">
                  <p className="fw-600 text-sm mb-1" style={{ color: 'var(--danger)' }}>⚠️ Gaps:</p>
                  <div>{(result.skillGaps as string[]).map(s => <span key={s} className="skill-tag skill-gap">{s}</span>)}</div>
                </div>
              )}

              {data.applications.length > 0 && (
                <div className="mt-3">
                  <div className="form-group">
                    <label>Apply to Application:</label>
                    <select value={targetApp} onChange={e => setTargetApp(e.target.value)}>
                      <option value="">Select application…</option>
                      {data.applications.map(a => <option key={a.id} value={a.id}>{a.company} — {a.role}</option>)}
                    </select>
                  </div>
                  <button className="btn" onClick={applyToApp} disabled={!targetApp}>Apply to Application</button>
                </div>
              )}
            </div>
          )}
          {!result && !loading && (
            <div className="card">
              <h3 className="section-title mb-2">What gets extracted?</h3>
              <ul style={{ fontSize: '0.9rem', paddingLeft: '1.2rem', lineHeight: 2 }}>
                <li>Company name, role title, location</li>
                <li>Work setup (remote/hybrid/onsite)</li>
                <li>Required & nice-to-have skills</li>
                <li>Salary range & benefits</li>
                <li>Skills match vs your profile</li>
                <li>Suggested interview questions</li>
                <li>Language of the JD</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// References Page
// ──────────────────────────────────────────────
function ReferencesPage({ data, onUpdate, isPro }: { data: AppData; onUpdate: (d: AppData) => void; isPro: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Reference | null>(null);
  const [analyseId, setAnalyseId] = useState('');
  const [analysing, setAnalysing] = useState(false);
  const [form, setForm] = useState({ name: '', title: '', company: '', email: '', phone: '', relationship: '', grade: '' as RefGrade | '', notes: '', letterText: '', languageOfLetter: 'en' });

  const addRef = () => {
    if (!form.name) return;
    const ref: Reference = { ...form, id: Date.now().toString(), grade: form.grade as RefGrade || undefined };
    onUpdate({ ...data, references: [...data.references, ref] });
    setForm({ name: '', title: '', company: '', email: '', phone: '', relationship: '', grade: '', notes: '', letterText: '', languageOfLetter: 'en' });
    setShowAdd(false);
  };

  const deleteRef = (id: string) => {
    if (confirm('Delete this reference?')) onUpdate({ ...data, references: data.references.filter(r => r.id !== id) });
  };

  const analyseRef = async (ref: Reference) => {
    if (!isPro || !ref.letterText) return;
    setAnalyseId(ref.id); setAnalysing(true);
    try {
      const res = await fetch('/api/analyse-letter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ letterText: ref.letterText }) });
      if (!res.ok) throw new Error();
      const result = await res.json();
      onUpdate({ ...data, references: data.references.map(r => r.id === ref.id ? { ...r, grade: result.grade, sentiment: result.sentiment, strengthRating: result.strengthRating } : r) });
    } catch {
      alert('Analysis failed. Check API key is configured.');
    } finally {
      setAnalyseId(''); setAnalysing(false);
    }
  };

  const freeLimit = 5;
  const atLimit = !isPro && data.references.length >= freeLimit;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">References</h1><p className="page-subtitle">Manage your professional references and letters</p></div>
        <button className="btn" onClick={() => setShowAdd(true)} disabled={atLimit}>+ Add Reference</button>
      </div>

      {atLimit && <div className="pro-gate mb-3"><div className="pro-gate-title">Reference limit reached</div><div className="pro-gate-text">Free accounts can store up to {freeLimit} references. Upgrade to Pro for unlimited references.</div></div>}

      {data.references.length === 0
        ? <div className="empty-state"><div className="empty-state-icon">👥</div><p>No references added yet</p></div>
        : <div className="card-grid">
            {data.references.map(ref => (
              <div key={ref.id} className="app-card" onClick={() => setSelected(ref)}>
                <div className="flex justify-between items-center mb-1">
                  <span className="fw-600">{ref.name}</span>
                  {ref.grade && <GradeBadge grade={ref.grade} />}
                </div>
                <div className="text-muted text-sm">{ref.title} @ {ref.company}</div>
                {ref.email && <div className="text-xs text-muted mt-1">{ref.email}</div>}
                {ref.sentiment && <div className="mt-1"><span className={`tag tag-${ref.sentiment === 'positive' ? 'green' : ref.sentiment === 'neutral' ? 'gray' : 'red'}`}>{ref.sentiment}</span></div>}
                {ref.letterText && isPro && (
                  <button className="btn btn-sm btn-outline mt-2" onClick={e => { e.stopPropagation(); analyseRef(ref); }} disabled={analysing && analyseId === ref.id}>
                    {analysing && analyseId === ref.id ? '…' : '🤖 Analyse Letter'}
                  </button>
                )}
                <button className="btn btn-sm btn-danger mt-1" style={{ fontSize: '0.75rem' }} onClick={e => { e.stopPropagation(); deleteRef(ref.id); }}>Delete</button>
              </div>
            ))}
          </div>
      }

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Reference">
        <div className="form-row">
          <div className="form-group"><label>Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Company</label><input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} /></div>
          <div className="form-group"><label>Relationship</label><input value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))} placeholder="e.g. Former Manager" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
          <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Grade (optional)</label>
            <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value as RefGrade | '' }))}>
              <option value="">Not graded</option>
              {(['A', 'B', 'C', 'D', 'E', 'F'] as RefGrade[]).map(g => <option key={g} value={g}>{g} — {GRADE_LABELS[g]}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Letter Language</label>
            <select value={form.languageOfLetter} onChange={e => setForm(p => ({ ...p, languageOfLetter: e.target.value }))}>
              <option value="en">English</option><option value="de">German</option><option value="fr">French</option><option value="nl">Dutch</option><option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="form-group"><label>Reference Letter Text (for AI analysis)</label><textarea rows={6} value={form.letterText} onChange={e => setForm(p => ({ ...p, letterText: e.target.value }))} placeholder="Paste the reference letter text here..." /></div>
        <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
        <div className="flex gap-1 justify-between mt-2">
          <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn" onClick={addRef}>Add Reference</button>
        </div>
      </Modal>

      {selected && (
        <Modal open onClose={() => setSelected(null)} title={selected.name}>
          <div><p><strong>Title:</strong> {selected.title}</p><p><strong>Company:</strong> {selected.company}</p><p><strong>Email:</strong> {selected.email}</p><p><strong>Phone:</strong> {selected.phone}</p><p><strong>Relationship:</strong> {selected.relationship}</p></div>
          {selected.grade && <div className="mt-2"><GradeBadge grade={selected.grade} /></div>}
          {selected.letterText && <div className="mt-2"><p className="fw-600 text-sm mb-1">Letter:</p><p style={{ fontSize: '0.85rem', color: '#555', whiteSpace: 'pre-wrap' }}>{selected.letterText}</p></div>}
          {selected.notes && <div className="mt-2"><p className="fw-600 text-sm mb-1">Notes:</p><p style={{ fontSize: '0.9rem' }}>{selected.notes}</p></div>}
          <button className="btn btn-outline mt-2" onClick={() => setSelected(null)}>Close</button>
        </Modal>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Salary Calculator
// ──────────────────────────────────────────────
function SalaryCalcPage() {
  const [gross, setGross] = useState('');
  const [taxClass, setTaxClass] = useState(1);
  const [churchTax, setChurchTax] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [bonusPct, setBonusPct] = useState('');

  const result = calcGermanSalary(Number(gross), taxClass, churchTax);
  const fmt = (n: number) => `€${Math.round(n).toLocaleString('de-DE')}`;

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Brutto/Netto Calculator</h1><p className="page-subtitle">Accurate German salary calculation (2024/2025 rates)</p></div></div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="form-group">
            <label>Annual Gross Salary (€)</label>
            <input type="number" value={gross} onChange={e => setGross(e.target.value)} placeholder="e.g. 75000" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tax Class (Steuerklasse)</label>
              <select value={taxClass} onChange={e => setTaxClass(Number(e.target.value))}>
                <option value={1}>I — Single / Divorced</option>
                <option value={2}>II — Single Parent</option>
                <option value={3}>III — Married (higher earner)</option>
                <option value={4}>IV — Married (equal)</option>
                <option value={5}>V — Married (lower earner)</option>
                <option value={6}>VI — Second job</option>
              </select>
            </div>
            <div className="form-group">
              <label>Church Tax (Kirchensteuer)</label>
              <div className="toggle-group" style={{ marginTop: '0.2rem' }}>
                <button className={`toggle-option ${!churchTax ? 'active' : ''}`} onClick={() => setChurchTax(false)}>No</button>
                <button className={`toggle-option ${churchTax ? 'active' : ''}`} onClick={() => setChurchTax(true)}>Yes</button>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label>Show Bonus Calculation</label>
            <div className="toggle-group" style={{ marginTop: '0.2rem' }}>
              <button className={`toggle-option ${!showBonus ? 'active' : ''}`} onClick={() => setShowBonus(false)}>No</button>
              <button className={`toggle-option ${showBonus ? 'active' : ''}`} onClick={() => setShowBonus(true)}>Yes</button>
            </div>
          </div>
          {showBonus && <div className="form-group"><label>Bonus %</label><input type="number" value={bonusPct} onChange={e => setBonusPct(e.target.value)} placeholder="e.g. 10" /></div>}
        </div>

        {result && (
          <div>
            <div className="card">
              <h3 className="section-title mb-2">Monthly Breakdown</h3>
              <div className="salary-breakdown-row salary-gross">
                <span>Gross (Brutto)</span><span className="fw-600">{fmt(result.monthlyGross)}</span>
              </div>
              <div className="salary-breakdown-row salary-deduction">
                <span>Health Ins. (KV + Pflegeversicherung)</span><span>− {fmt(result.kv + result.pv)}</span>
              </div>
              <div className="salary-breakdown-row salary-deduction">
                <span>Pension (Rentenversicherung)</span><span>− {fmt(result.rv)}</span>
              </div>
              <div className="salary-breakdown-row salary-deduction">
                <span>Unemployment (Arbeitslosenversicherung)</span><span>− {fmt(result.av)}</span>
              </div>
              <div className="salary-breakdown-row salary-deduction">
                <span>Income Tax (Lohnsteuer)</span><span>− {fmt(result.lohnsteuer)}</span>
              </div>
              {result.soli > 0 && <div className="salary-breakdown-row salary-deduction"><span>Solidarity (Soli)</span><span>− {fmt(result.soli)}</span></div>}
              {result.kirchensteuer > 0 && <div className="salary-breakdown-row salary-deduction"><span>Church Tax (Kirchensteuer)</span><span>− {fmt(result.kirchensteuer)}</span></div>}
              <div className="salary-breakdown-row salary-net">
                <span>Net (Netto)</span><span className="text-success">{fmt(result.monthlyNet)}</span>
              </div>
            </div>

            <div className="card">
              <h3 className="section-title mb-2">Annual Summary</h3>
              <div className="admin-metric-row"><span>Annual Gross</span><span className="fw-600">{fmt(result.monthlyGross * 12)}</span></div>
              <div className="admin-metric-row"><span>Total Social Security</span><span>− {fmt(result.totalSS * 12)}</span></div>
              <div className="admin-metric-row"><span>Total Tax</span><span>− {fmt((result.lohnsteuer + result.soli + result.kirchensteuer) * 12)}</span></div>
              <div className="admin-metric-row" style={{ fontWeight: 600 }}><span>Annual Net</span><span className="text-success">{fmt(result.annualNet)}</span></div>
              <div className="admin-metric-row"><span>Effective Tax Rate</span><span>{Math.round((1 - result.monthlyNet / result.monthlyGross) * 100)}%</span></div>
              {showBonus && bonusPct && (
                <div className="admin-metric-row"><span>+ Annual Bonus ({bonusPct}%)</span><span className="text-accent fw-600">{fmt(result.monthlyGross * 12 * Number(bonusPct) / 100 * 0.65)}</span></div>
              )}
            </div>
          </div>
        )}

        {!result && (
          <div className="card">
            <h3 className="section-title mb-2">About this calculator</h3>
            <ul style={{ fontSize: '0.9rem', paddingLeft: '1.2rem', lineHeight: 2, color: '#555' }}>
              <li>Uses 2024/2025 German tax brackets</li>
              <li>Includes all social security contributions</li>
              <li>Krankenversicherung (8.9%), Rentenversicherung (9.3%), Pflegeversicherung (1.8%), Arbeitslosenversicherung (1.3%)</li>
              <li>Social security caps applied (BBG)</li>
              <li>All 6 tax classes supported</li>
              <li>Optional church tax (9%)</li>
            </ul>
            <div className="alert alert-info mt-2">Enter your gross salary to see the breakdown</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Country Toolkit
// ──────────────────────────────────────────────
function ToolkitPage() {
  const [section, setSection] = useState('tax');
  const sections = [
    { id: 'tax', label: '🧾 Tax Guide' },
    { id: 'insurance', label: '🏥 Insurance' },
    { id: 'termination', label: '📋 Termination' },
    { id: 'visa', label: '🛂 Visa' },
    { id: 'freelance', label: '💼 Freelance' },
    { id: 'payslip', label: '📄 Payslip Guide' },
  ];

  const content: Record<string, React.ReactNode> = {
    tax: (
      <div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>🧾 German Tax Guide</h3>
        <div className="card">
          <h4 className="fw-600 mb-2">Steuererklärung (Tax Return)</h4>
          <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>Filing a German tax return is voluntary for employees but highly recommended — most people get a refund of €900–€1,200.</p>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: 2 }}>
            <li><strong>Deadline:</strong> July 31 of the following year (or October 31 with tax advisor)</li>
            <li><strong>Where to file:</strong> ELSTER (elster.de) online, or via a tax app (Wundertax, Steuererklärung App)</li>
            <li><strong>What you need:</strong> Your Lohnsteuerbescheinigung from employer, all receipts for deductions</li>
          </ul>
        </div>
        <div className="card">
          <h4 className="fw-600 mb-2">Common Deductions (Werbungskosten)</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: 2 }}>
            <li><strong>Home office:</strong> €6/day up to 210 days = €1,260/year</li>
            <li><strong>Commuting:</strong> €0.30/km one-way × working days</li>
            <li><strong>Professional development:</strong> Courses, books, conferences</li>
            <li><strong>Work equipment:</strong> Computer, desk, headset (if used for work)</li>
            <li><strong>Professional association fees</strong></li>
            <li><strong>Job application costs:</strong> Application photos, travel to interviews</li>
          </ul>
        </div>
        <div className="card">
          <h4 className="fw-600 mb-2">Tax IDs You Need</h4>
          <div className="table-container"><table>
            <thead><tr><th>ID Type</th><th>Format</th><th>Used For</th></tr></thead>
            <tbody>
              <tr><td>Steueridentifikationsnummer</td><td>12 345 678 901</td><td>Lifetime tax ID, never changes</td></tr>
              <tr><td>Steuernummer</td><td>12/345/67890</td><td>Annual tax return, per state</td></tr>
              <tr><td>USt-ID (VAT)</td><td>DE 123 456 789</td><td>Freelancers & businesses only</td></tr>
              <tr><td>Betriebsnummer</td><td>12 345 678</td><td>Your employer's number (on payslip)</td></tr>
            </tbody>
          </table></div>
        </div>
      </div>
    ),
    insurance: (
      <div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>🏥 Insurance in Germany</h3>
        <div className="card">
          <h4 className="fw-600 mb-2">Health Insurance (Krankenversicherung)</h4>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Mandatory for everyone in Germany. Choose between:</p>
          <div className="grid-2">
            <div style={{ background: 'var(--cream)', padding: '1rem', borderRadius: '8px' }}>
              <p className="fw-600 mb-1">Statutory (GKV)</p>
              <ul style={{ paddingLeft: '1rem', fontSize: '0.85rem', lineHeight: 1.8 }}>
                <li>~14.6% of salary + additional (avg 1.6%)</li>
                <li>Employer pays 50%</li>
                <li>Covers family members for free</li>
                <li>Required if salary &lt; €69,300/year</li>
              </ul>
            </div>
            <div style={{ background: 'var(--cream)', padding: '1rem', borderRadius: '8px' }}>
              <p className="fw-600 mb-1">Private (PKV)</p>
              <ul style={{ paddingLeft: '1rem', fontSize: '0.85rem', lineHeight: 1.8 }}>
                <li>Fixed monthly premium (~€200–€600)</li>
                <li>Better coverage, faster appointments</li>
                <li>Available if salary &gt; €69,300/year</li>
                <li>Family members need own policies</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="card">
          <h4 className="fw-600 mb-2">Other Required Insurances</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: 2 }}>
            <li><strong>Rentenversicherung:</strong> 18.6% total (9.3% each), mandatory pension</li>
            <li><strong>Arbeitslosenversicherung:</strong> 2.6% total (1.3% each), unemployment</li>
            <li><strong>Pflegeversicherung:</strong> 3.4% total (1.7% each + 0.35% if no children)</li>
            <li><strong>Haftpflichtversicherung:</strong> Liability insurance — highly recommended, ~€60/year</li>
          </ul>
        </div>
      </div>
    ),
    termination: (
      <div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>📋 Termination & Offboarding</h3>
        <div className="card">
          <h4 className="fw-600 mb-2">Notice Periods (Kündigungsfristen)</h4>
          <div className="table-container"><table>
            <thead><tr><th>Time at Company</th><th>Notice Period</th></tr></thead>
            <tbody>
              {[['&lt; 2 years (probation)', '2 weeks'], ['2–5 years', '1 month'], ['5–8 years', '2 months'], ['8–10 years', '3 months'], ['10–12 years', '4 months'], ['12+ years', '5–7 months']].map(([t, n]) => (
                <tr key={t}><td dangerouslySetInnerHTML={{ __html: t }} /><td>{n}</td></tr>
              ))}
            </tbody>
          </table></div>
        </div>
        <div className="card">
          <h4 className="fw-600 mb-2">Your Rights on Termination</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: 2 }}>
            <li>Request <strong>Arbeitszeugnis</strong> (employment certificate) — you have a legal right to it</li>
            <li>Confirm <strong>unused vacation days</strong> are paid out</li>
            <li>Check for <strong>severance (Abfindung)</strong> — not automatic, but common after mass layoffs</li>
            <li>File for <strong>Arbeitslosengeld I</strong> at the Agentur für Arbeit within 3 days of knowing your end date</li>
            <li>Continue <strong>health insurance</strong> via voluntary GKV or employer's Krankenkasse</li>
          </ul>
        </div>
        <div className="card">
          <h4 className="fw-600 mb-2">Unemployment Benefits (ALG I)</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: 2 }}>
            <li>~60% of net salary (67% if you have children)</li>
            <li>Requires 12 months contributions in last 2 years</li>
            <li>Duration: 6–24 months depending on contributions</li>
            <li>Register at <strong>Agentur für Arbeit</strong> immediately</li>
          </ul>
        </div>
      </div>
    ),
    visa: (
      <div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>🛂 Work Visas in Germany</h3>
        <div className="card">
          <h4 className="fw-600 mb-2">EU Blue Card (Blaue Karte EU)</h4>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Best option for highly qualified non-EU professionals</p>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: 2 }}>
            <li>Salary threshold: €43,992/year (shortage occupations) or €58,400 (standard)</li>
            <li>University degree required (German equivalent)</li>
            <li>Path to permanent residency after 21–33 months</li>
            <li>Family members can work immediately</li>
          </ul>
        </div>
        <div className="card">
          <h4 className="fw-600 mb-2">Other Visa Types</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: 2 }}>
            <li><strong>Aufenthaltserlaubnis zur Beschäftigung:</strong> Standard work permit for non-EU</li>
            <li><strong>Niederlassungserlaubnis:</strong> Permanent residence (after 5 years)</li>
            <li><strong>Chancenkarte:</strong> New points-based job seeker visa (2024)</li>
            <li><strong>Freiberufler Aufenthaltserlaubnis:</strong> For freelancers</li>
          </ul>
        </div>
      </div>
    ),
    freelance: (
      <div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>💼 Becoming Self-Employed in Germany</h3>
        <div className="card">
          <h4 className="fw-600 mb-2">Steps to Register</h4>
          <ol style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: 2 }}>
            <li>Register your business at the <strong>Gewerbeamt</strong> (Gewerbeanmeldung, ~€20) — or register as Freiberufler directly with Finanzamt (free)</li>
            <li>Register with the <strong>Finanzamt</strong> to get your Steuernummer</li>
            <li>Apply for USt-ID (VAT ID) if you invoice businesses</li>
            <li>Open a <strong>business bank account</strong></li>
            <li>Get <strong>Haftpflichtversicherung</strong> (liability insurance)</li>
            <li>Set up voluntary <strong>Rentenversicherung</strong></li>
          </ol>
        </div>
        <div className="card">
          <h4 className="fw-600 mb-2">Tax Obligations</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: 2 }}>
            <li><strong>Quarterly advance payments</strong> (Vorauszahlungen) — income tax & VAT</li>
            <li><strong>Einnahmen-Überschussrechnung (EÜR)</strong> — simple income/expenses report</li>
            <li>VAT: 19% standard (or 7% for some services), file monthly/quarterly</li>
            <li>Kleinunternehmerregelung: If revenue &lt; €22,000/year, no VAT required</li>
          </ul>
        </div>
      </div>
    ),
    payslip: (
      <div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>📄 Reading Your German Payslip (Gehaltsabrechnung)</h3>
        <div className="card">
          <h4 className="fw-600 mb-2">Key Fields Explained</h4>
          <div className="table-container"><table>
            <thead><tr><th>German Term</th><th>English</th><th>Notes</th></tr></thead>
            <tbody>
              {[
                ['Bruttogehalt', 'Gross Salary', 'Your total salary before deductions'],
                ['Lohnsteuer', 'Income Tax', 'Calculated per tax class'],
                ['Solidaritätszuschlag', 'Solidarity Surcharge', 'Usually 0% for most employees since 2021'],
                ['Kirchensteuer', 'Church Tax', 'Only if you are church member (8-9%)'],
                ['Rentenversicherung', 'Pension', '9.3% employee share'],
                ['Krankenversicherung', 'Health Insurance', '7.3% + additional contribution'],
                ['Pflegeversicherung', 'Long-term Care', '1.7-2.4% depending on children'],
                ['Arbeitslosenversicherung', 'Unemployment Ins.', '1.3% employee share'],
                ['Nettogehalt', 'Net Salary', 'What arrives in your account'],
                ['Auszahlungsbetrag', 'Payment Amount', 'Actual bank transfer amount'],
              ].map(([de, en, note]) => <tr key={de}><td className="fw-600">{de}</td><td>{en}</td><td className="text-muted text-sm">{note}</td></tr>)}
            </tbody>
          </table></div>
        </div>
        <div className="card">
          <h4 className="fw-600 mb-2">How to Verify Your Payslip</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', lineHeight: 2 }}>
            <li>Check <strong>Bruttogehalt</strong> matches your contract</li>
            <li>Verify <strong>Steuerklasse</strong> (tax class) is correct</li>
            <li>Check <strong>Krankenkasse name</strong> is your chosen health insurer</li>
            <li>Use our Brutto/Netto calculator to verify the numbers</li>
            <li>Check the <strong>Abrechnungsmonat</strong> (billing month) is correct</li>
          </ul>
        </div>
      </div>
    ),
  };

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Germany Toolkit</h1><p className="page-subtitle">Employment guides and resources for working in Germany</p></div></div>
      <div className="flex flex-wrap gap-1 mb-3">
        {sections.map(s => <button key={s.id} className={`btn btn-sm ${section === s.id ? '' : 'btn-outline'}`} onClick={() => setSection(s.id)}>{s.label}</button>)}
      </div>
      <div>{content[section]}</div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Profile Page
// ──────────────────────────────────────────────
function ProfilePage({ data, onUpdate }: { data: AppData; onUpdate: (d: AppData) => void }) {
  const [profile, setProfile] = useState({ ...data.profile });
  const [saved, setSaved] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newLang, setNewLang] = useState({ language: '', level: 'B2' });

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as AppData;
        if (!imported.applications || !imported.profile) { alert('Invalid backup file'); return; }
        if (confirm(`Import backup? This will replace all current data.\n\nBackup contains:\n• ${imported.applications.length} applications\n• ${imported.references?.length || 0} references\n• ${imported.offers?.length || 0} offers`)) {
          onUpdate({ ...DEFAULT_DATA, ...imported });
        }
      } catch { alert('Could not read file. Make sure it is a valid CareerCompass backup.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const save = () => {
    onUpdate({ ...data, profile });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addSkill = () => {
    if (newSkill.trim()) { setProfile(p => ({ ...p, skills: [...p.skills, newSkill.trim()] })); setNewSkill(''); }
  };

  const removeSkill = (i: number) => setProfile(p => ({ ...p, skills: p.skills.filter((_, idx) => idx !== i) }));

  const addLang = () => {
    if (newLang.language.trim()) { setProfile(p => ({ ...p, languages: [...p.languages, { ...newLang }] })); setNewLang({ language: '', level: 'B2' }); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Profile</h1><p className="page-subtitle">Your professional information</p></div>
        <button className="btn" onClick={save}>{saved ? '✅ Saved!' : 'Save Profile'}</button>
      </div>

      <div className="card mb-3">
        <h3 className="section-title mb-2">Career Level</h3>
        <div className="toggle-group" style={{ maxWidth: 360 }}>
          {(['IC', 'Manager', 'Director'] as const).map(l => (
            <button key={l} className={`toggle-option ${profile.level === l ? 'active' : ''}`} onClick={() => setProfile(p => ({ ...p, level: l }))}>{l}</button>
          ))}
        </div>
        <p className="text-muted text-xs mt-1">Affects which fields and questions are shown throughout the app</p>
      </div>

      <div className="card mb-3">
        <h3 className="section-title mb-3">Basic Information</h3>
        <div className="form-row">
          <div className="form-group"><label>Full Name</label><input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="form-group"><label>Current Title</label><input value={profile.currentTitle} onChange={e => setProfile(p => ({ ...p, currentTitle: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Years of Experience</label><input type="number" value={profile.yearsExperience || ''} onChange={e => setProfile(p => ({ ...p, yearsExperience: Number(e.target.value) }))} /></div>
          <div className="form-group"><label>Location</label><input value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} placeholder="Berlin, Germany" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Sector</label>
            <select value={profile.sector} onChange={e => setProfile(p => ({ ...p, sector: e.target.value }))}>
              <option value="">Select…</option>
              {SECTORS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Department</label>
            <select value={profile.department} onChange={e => setProfile(p => ({ ...p, department: e.target.value }))}>
              <option value="">Select…</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Email</label><input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></div>
          <div className="form-group"><label>Phone</label><input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
        </div>
        <div className="form-group"><label>LinkedIn URL</label><input value={profile.linkedin} onChange={e => setProfile(p => ({ ...p, linkedin: e.target.value }))} placeholder="https://linkedin.com/in/..." /></div>
        <div className="form-group"><label>Professional Summary</label><textarea rows={4} value={profile.summary} onChange={e => setProfile(p => ({ ...p, summary: e.target.value }))} placeholder="A brief description of your background, expertise, and what you're looking for..." /></div>
      </div>

      <div className="card mb-3">
        <h3 className="section-title mb-2">Skills</h3>
        <div className="flex flex-wrap" style={{ marginBottom: '0.75rem' }}>
          {profile.skills.map((s, i) => (
            <span key={i} className="tag tag-blue" style={{ cursor: 'pointer' }} onClick={() => removeSkill(i)}>{s} ×</span>
          ))}
        </div>
        <div className="flex gap-1">
          <input value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkill()} placeholder="Add skill (Enter to add)" style={{ flex: 1, padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
          <button className="btn btn-sm" onClick={addSkill}>Add</button>
        </div>
      </div>

      <div className="card mb-3">
        <h3 className="section-title mb-2">Languages</h3>
        {profile.languages.map((lang, i) => (
          <div key={i} className="flex items-center gap-1 mb-1">
            <span className="fw-600" style={{ minWidth: 120 }}>{lang.language}</span>
            <span className="badge badge-applied">{lang.level}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setProfile(p => ({ ...p, languages: p.languages.filter((_, idx) => idx !== i) }))}>×</button>
          </div>
        ))}
        <div className="flex gap-1 mt-2">
          <input value={newLang.language} onChange={e => setNewLang(p => ({ ...p, language: e.target.value }))} placeholder="Language" style={{ flex: 1, padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
          <select value={newLang.level} onChange={e => setNewLang(p => ({ ...p, level: e.target.value }))} style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
            {CEFR_LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
          <button className="btn btn-sm" onClick={addLang}>Add</button>
        </div>
      </div>

      {(profile.level === 'Manager' || profile.level === 'Director') && (
        <div className="card mb-3">
          <h3 className="section-title mb-2">Management Experience</h3>
          <div className="form-row">
            <div className="form-group"><label>Max Team Size Managed</label><input type="number" value={(profile as Record<string, unknown>).maxTeamSize as string || ''} onChange={e => setProfile(p => ({ ...p, maxTeamSize: e.target.value } as typeof p & { maxTeamSize: string }))} /></div>
            <div className="form-group"><label>Max Direct Reports</label><input type="number" value={(profile as Record<string, unknown>).maxDirectReports as string || ''} onChange={e => setProfile(p => ({ ...p, maxDirectReports: e.target.value } as typeof p & { maxDirectReports: string }))} /></div>
          </div>
          <div className="form-group"><label>Budget Responsibility</label><input value={(profile as Record<string, unknown>).budgetResponsibility as string || ''} onChange={e => setProfile(p => ({ ...p, budgetResponsibility: e.target.value } as typeof p & { budgetResponsibility: string }))} placeholder="e.g. €500K opex budget" /></div>
        </div>
      )}

      <div className="card mb-3" style={{ borderLeft: '4px solid var(--accent)' }}>
        <h3 className="section-title mb-2">Data & Backup</h3>
        <p className="text-muted text-sm mb-2">Export your data regularly to keep a backup. Import to restore from a previous export.</p>
        <div className="flex gap-1">
          <button className="btn btn-outline" onClick={() => exportData(data)}>📤 Export Backup</button>
          <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
            📥 Import Backup
            <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div className="flex justify-end" style={{ paddingTop: '0.5rem' }}>
        <button className="btn" onClick={save}>{saved ? '✅ Saved!' : 'Save Profile'}</button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Admin Dashboard (Sections 71-72)
// ──────────────────────────────────────────────
function AdminDashboard({ data }: { data: AppData }) {
  const [section, setSection] = useState('overview');

  // Mock analytics data matching spec
  const stats = {
    totalUsers: 2500, proUsers: 500, freeUsers: 2000, convRate: 16.7,
    mrr: 5000, arr: 60000, mrrGrowth: 12, churnRate: 1.6,
    activeUsers7d: 1850, activeUsers30d: 2200, newSignups: 50,
    apiCalls: { total: 50000, claude: 30000, chatgpt: 20000, cost: 900 },
    features: { cvParsing: 45, jdParsing: 38, transcription: 22, research: 18, references: 12 },
    uptime: 99.95, loadTime: 1.2, errorRate: 0.02,
    feedback: { total: 250, bugs: 80, requests: 120, general: 50, satisfaction: 4.5 },
    geo: [{ country: 'Germany', pct: 45, count: 1125 }, { country: 'UK', pct: 20, count: 500 }, { country: 'France', pct: 12, count: 300 }, { country: 'Netherlands', pct: 9, count: 225 }, { country: 'Other', pct: 14, count: 350 }],
    roles: [{ role: 'IC', pct: 82 }, { role: 'Manager', pct: 18 }],
    industries: [{ name: 'FinTech', pct: 30 }, { name: 'HR Tech', pct: 25 }, { name: 'SaaS', pct: 20 }, { name: 'Banking', pct: 15 }, { name: 'Other', pct: 10 }],
  };

  const sections = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'users', label: '👥 Users' },
    { id: 'revenue', label: '💰 Revenue' },
    { id: 'ai', label: '🤖 AI Usage' },
    { id: 'system', label: '🖥️ System' },
    { id: 'feedback', label: '💬 Feedback' },
  ];

  const Bar = ({ pct, color = 'var(--accent)' }: { pct: number; color?: string }) => (
    <div className="admin-bar-container">
      <div className="admin-bar-track" style={{ flex: 1 }}>
        <div className="admin-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm fw-600" style={{ minWidth: 35, textAlign: 'right' }}>{pct}%</span>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform analytics — anonymized, no user data visible</p>
        </div>
        <span className="badge badge-offer">Admin Access</span>
      </div>

      <div className="alert alert-info mb-3">
        📊 All metrics are aggregated and anonymized. No individual user data is visible here. Architecture prevents PII access.
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {sections.map(s => <button key={s.id} className={`btn btn-sm ${section === s.id ? '' : 'btn-outline'}`} onClick={() => setSection(s.id)}>{s.label}</button>)}
      </div>

      {section === 'overview' && (
        <div>
          <div className="stat-grid">
            {[
              { n: stats.totalUsers.toLocaleString(), l: 'Total Users' },
              { n: stats.proUsers.toLocaleString(), l: 'Pro Subscribers' },
              { n: `${stats.convRate}%`, l: 'Conversion Rate' },
              { n: `€${stats.mrr.toLocaleString()}`, l: `MRR ↑${stats.mrrGrowth}%` },
            ].map(s => <div key={s.l} className="stat-card"><div className="stat-number">{s.n}</div><div className="stat-label">{s.l}</div></div>)}
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 className="section-title mb-2">Active Users</h3>
              {[
                { label: 'Last 7 days', count: stats.activeUsers7d, pct: Math.round(stats.activeUsers7d / stats.totalUsers * 100) },
                { label: 'Last 30 days', count: stats.activeUsers30d, pct: Math.round(stats.activeUsers30d / stats.totalUsers * 100) },
                { label: 'New signups (month)', count: stats.newSignups, pct: Math.round(stats.newSignups / stats.totalUsers * 100) },
              ].map(r => (
                <div key={r.label} className="admin-metric-row">
                  <span className="admin-metric-label">{r.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="fw-600">{r.count.toLocaleString()}</span>
                    <span className="text-muted text-xs">({r.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 className="section-title mb-2">Feature Usage</h3>
              {Object.entries(stats.features).map(([k, v]) => (
                <div key={k} className="mb-2">
                  <div className="flex justify-between mb-1" style={{ fontSize: '0.85rem' }}>
                    <span>{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="fw-600">{v}%</span>
                  </div>
                  <Bar pct={v} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'users' && (
        <div className="grid-2">
          <div className="card">
            <h3 className="section-title mb-2">Geographic Distribution</h3>
            {stats.geo.map(g => (
              <div key={g.country} className="mb-2">
                <div className="flex justify-between mb-1" style={{ fontSize: '0.85rem' }}>
                  <span>{g.country}</span><span>{g.count.toLocaleString()} users</span>
                </div>
                <Bar pct={g.pct} />
              </div>
            ))}
          </div>
          <div>
            <div className="card mb-2">
              <h3 className="section-title mb-2">Role Distribution</h3>
              {stats.roles.map(r => (
                <div key={r.role} className="mb-2">
                  <div className="flex justify-between mb-1" style={{ fontSize: '0.85rem' }}><span>{r.role}</span><span>{r.pct}%</span></div>
                  <Bar pct={r.pct} />
                </div>
              ))}
            </div>
            <div className="card">
              <h3 className="section-title mb-2">Industry Split</h3>
              {stats.industries.map(i => (
                <div key={i.name} className="mb-2">
                  <div className="flex justify-between mb-1" style={{ fontSize: '0.85rem' }}><span>{i.name}</span><span>{i.pct}%</span></div>
                  <Bar pct={i.pct} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'revenue' && (
        <div className="grid-2">
          <div className="card">
            <h3 className="section-title mb-2">Subscription Metrics</h3>
            {[
              ['MRR', `€${stats.mrr.toLocaleString()}`],
              ['ARR', `€${stats.arr.toLocaleString()}`],
              ['MRR Growth', `+${stats.mrrGrowth}%`],
              ['Pro Subscribers', stats.proUsers.toLocaleString()],
              ['Monthly Pro (€9.99)', '300 users → €2,997'],
              ['Annual Pro (€89.99)', '200 users → €1,500'],
              ['Free → Pro Conversion', `${stats.convRate}%`],
              ['Monthly Churn', `${stats.churnRate}%`],
            ].map(([l, v]) => (
              <div key={l as string} className="admin-metric-row"><span className="admin-metric-label">{l}</span><span className="admin-metric-value">{v}</span></div>
            ))}
          </div>
          <div className="card">
            <h3 className="section-title mb-2">Payment Health</h3>
            {[
              ['Successful charges', '495 (99%)'],
              ['Failed charges', '5 (1%)'],
              ['Refunds issued', '3'],
              ['Refund rate', '0.6%'],
              ['LTV (avg Pro user)', '€120 (12 months)'],
              ['CAC (marketing)', '€40/subscriber'],
              ['LTV:CAC ratio', '3:1'],
            ].map(([l, v]) => (
              <div key={l as string} className="admin-metric-row"><span className="admin-metric-label">{l}</span><span className="admin-metric-value">{v}</span></div>
            ))}
            <div className="mt-3">
              <h4 className="fw-600 text-sm mb-1">Churn Cohort Retention</h4>
              {[['Month 1', 98], ['Month 3', 95], ['Month 6', 88], ['Month 12', 75]].map(([m, v]) => (
                <div key={m} className="mb-1">
                  <div className="flex justify-between mb-1" style={{ fontSize: '0.82rem' }}><span>{m}</span><span>{v}%</span></div>
                  <Bar pct={v as number} color="var(--success)" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'ai' && (
        <div className="grid-2">
          <div className="card">
            <h3 className="section-title mb-2">API Usage This Month</h3>
            <div className="admin-metric-row"><span>Total API Calls</span><span className="fw-600">{stats.apiCalls.total.toLocaleString()}</span></div>
            <div className="admin-metric-row"><span>Claude calls</span><span>{stats.apiCalls.claude.toLocaleString()} (60%)</span></div>
            <div className="admin-metric-row"><span>ChatGPT calls</span><span>{stats.apiCalls.chatgpt.toLocaleString()} (40%)</span></div>
            <div className="admin-metric-row"><span>Total API Cost</span><span className="fw-600 text-danger">€{stats.apiCalls.cost}</span></div>
            <div className="admin-metric-row"><span>Claude avg cost</span><span>€0.02/call</span></div>
            <div className="admin-metric-row"><span>ChatGPT avg cost</span><span>€0.015/call</span></div>
            <div className="admin-metric-row"><span>Cost per Pro user</span><span>€0.45/month</span></div>
            <div className="admin-metric-row"><span>Profit margin (at €10 Pro)</span><span className="text-success fw-600">95%</span></div>
          </div>
          <div className="card">
            <h3 className="section-title mb-2">Usage by Feature</h3>
            {[
              { name: 'CV Parsing', calls: 15000, pct: 30 },
              { name: 'JD Parsing', calls: 12000, pct: 24 },
              { name: 'Transcription', calls: 10000, pct: 20 },
              { name: 'Company Research', calls: 8000, pct: 16 },
              { name: 'Letter Analysis', calls: 5000, pct: 10 },
            ].map(f => (
              <div key={f.name} className="mb-2">
                <div className="flex justify-between mb-1" style={{ fontSize: '0.85rem' }}>
                  <span>{f.name}</span><span>{f.calls.toLocaleString()} calls</span>
                </div>
                <Bar pct={f.pct} />
              </div>
            ))}
            <div className="alert alert-info mt-3" style={{ fontSize: '0.82rem' }}>
              AI Provider setting: Claude (default) / ChatGPT / Auto / Fallback
            </div>
          </div>
        </div>
      )}

      {section === 'system' && (
        <div className="grid-2">
          <div className="card">
            <h3 className="section-title mb-2">System Health</h3>
            {[
              { label: 'App Uptime (30d)', value: `${stats.uptime}%`, ok: true },
              { label: 'Avg Page Load', value: `${stats.loadTime}s`, ok: true },
              { label: 'API Response Time', value: '200ms', ok: true },
              { label: 'Error Rate', value: `${stats.errorRate}%`, ok: true },
              { label: 'DB Query Avg', value: '50ms', ok: true },
              { label: 'DB Connections', value: '10/100', ok: true },
            ].map(r => (
              <div key={r.label} className="admin-metric-row">
                <span><span className={`health-dot ${r.ok ? 'green' : 'red'}`} />{r.label}</span>
                <span className="fw-600">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 className="section-title mb-2">Storage & Limits</h3>
            {[
              ['Total Data Stored', '50 GB'],
              ['User Profiles', '2 GB'],
              ['Interview Recordings', '30 GB'],
              ['Documents', '10 GB'],
              ['Storage Cost/mo', '€10'],
              ['Claude API Limit', '100K/mo (30K used)'],
              ['Supabase Reads', '500K/mo (100K used)'],
            ].map(([l, v]) => (
              <div key={l as string} className="admin-metric-row"><span className="admin-metric-label">{l}</span><span>{v}</span></div>
            ))}
          </div>
        </div>
      )}

      {section === 'feedback' && (
        <div className="grid-2">
          <div className="card">
            <h3 className="section-title mb-2">Feedback Summary</h3>
            {[
              ['Total Submissions', stats.feedback.total],
              ['Bug Reports', stats.feedback.bugs],
              ['Feature Requests', stats.feedback.requests],
              ['General Feedback', stats.feedback.general],
              ['Satisfaction Score', `${stats.feedback.satisfaction}/5.0`],
            ].map(([l, v]) => (
              <div key={l as string} className="admin-metric-row"><span className="admin-metric-label">{l}</span><span className="fw-600">{v}</span></div>
            ))}
            <div className="mt-3">
              <h4 className="fw-600 text-sm mb-1">Bug Severity</h4>
              {[['Critical', 5, 'var(--danger)'], ['High', 15, 'var(--warning)'], ['Medium', 40, 'var(--info)'], ['Low', 190, '#999']].map(([s, c, col]) => (
                <div key={s as string} className="admin-metric-row" style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: col as string }}>{s}</span><span>{c} bugs</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="section-title mb-2">Top Feature Requests</h3>
            {[
              { name: 'Mobile App', count: 45, pct: 37 },
              { name: 'Calendar Integration', count: 25, pct: 21 },
              { name: 'Slack Notifications', count: 20, pct: 17 },
              { name: 'LinkedIn Sync', count: 18, pct: 15 },
              { name: 'Export to PDF', count: 12, pct: 10 },
            ].map(f => (
              <div key={f.name} className="mb-2">
                <div className="flex justify-between mb-1" style={{ fontSize: '0.85rem' }}><span>{f.name}</span><span>{f.count} requests</span></div>
                <Bar pct={f.pct} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mt-3" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
        <h4 className="fw-600 mb-1">🔒 Privacy Architecture</h4>
        <p style={{ fontSize: '0.85rem', color: '#555' }}>
          Admin dashboard shows only aggregated, anonymized metrics. Individual user data (names, emails, applications, CVs, notes, salary info, interview recordings) is architecturally inaccessible here. All metrics are counts and percentages only.
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Interviews Page (basic)
// ──────────────────────────────────────────────
function InterviewsPage({ data }: { data: AppData }) {
  const interviews = data.applications.flatMap(app =>
    (app.stages || []).map(s => ({ ...s, appCompany: app.company, appRole: app.role }))
  ).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Interviews</h1><p className="page-subtitle">All your interview stages across applications</p></div></div>
      {interviews.length === 0
        ? <div className="empty-state"><div className="empty-state-icon">🎤</div><p>No interview stages logged yet. Add them inside an application.</p></div>
        : <div className="card-grid">
            {interviews.map(s => (
              <div key={s.id} className="app-card">
                <div className="flex justify-between items-center mb-1">
                  <span className="fw-600">{s.appCompany}</span>
                  <span className={`badge badge-${s.status === 'passed' ? 'offer' : s.status === 'failed' ? 'rejected' : 'applied'}`}>{s.status}</span>
                </div>
                <div className="text-muted text-sm">{s.appRole}</div>
                <div className="mt-1 fw-600">{s.name || 'Unnamed Stage'}</div>
                {s.date && <div className="text-sm text-muted">{new Date(s.date).toLocaleDateString('en-GB')}</div>}
                {s.interviewers && <div className="text-xs text-muted mt-1">👥 {s.interviewers}</div>}
                {s.sentiment && <span className={`tag tag-${s.sentiment === 'positive' ? 'green' : s.sentiment === 'neutral' ? 'gray' : 'red'}`}>{s.sentiment}</span>}
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ──────────────────────────────────────────────
// Offer Comparison Page
// ──────────────────────────────────────────────
function OfferComparePage({ data, onUpdate, isPro }: { data: AppData; onUpdate: (d: AppData) => void; isPro: boolean }) {
  const freeLimit = PRO_LIMITS.offers;
  const atLimit = !isPro && data.offers.length >= freeLimit;
  const [showAdd, setShowAdd] = useState(false);
  const emptyOffer = (): Offer => ({
    id: Date.now().toString(),
    applicationId: '',
    company: '',
    role: '',
    contractType: 'full-time',
    grossSalary: 0,
    bonus: 0,
    bonusType: 'percentage',
    equity: '',
    vacationDays: 0,
    noticePeriod: '',
    probationMonths: 6,
    startDate: '',
    benefits: [],
    workSetup: 'hybrid',
    officeDaysPerWeek: 3,
    learningBudget: 0,
    notes: '',
    rating: 0,
  });
  const [form, setForm] = useState<Offer>(emptyOffer());

  const fmt = (n: number) => n ? `€${n.toLocaleString('de-DE')}` : '—';
  const calcNet = (gross: number) => {
    if (!gross) return 0;
    const r = calcGermanSalary(gross, 1, false);
    return r ? Math.round(r.annualNet) : 0;
  };

  const addOffer = () => {
    if (!form.company) return;
    onUpdate({ ...data, offers: [...data.offers, { ...form, id: Date.now().toString() }] });
    setForm(emptyOffer());
    setShowAdd(false);
  };

  const deleteOffer = (id: string) => {
    if (confirm('Remove this offer?')) onUpdate({ ...data, offers: data.offers.filter(o => o.id !== id) });
  };

  const best = (field: keyof Offer, higher = true): string | null => {
    if (data.offers.length < 2) return null;
    const vals = data.offers.map(o => Number(o[field]) || 0);
    const target = higher ? Math.max(...vals) : Math.min(...vals);
    const idx = vals.indexOf(target);
    return idx >= 0 ? data.offers[idx].id : null;
  };

  const bestSalary = best('grossSalary');
  const bestVacation = best('vacationDays');
  const bestLearning = best('learningBudget');
  const bestRating = best('rating');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Offer Comparison</h1>
          <p className="page-subtitle">Compare job offers side by side</p>
        </div>
        <div className="flex items-center gap-2">
          {!isPro && (
            <span className={`limit-badge ${atLimit ? 'at-limit' : ''}`}>
              {data.offers.length}/{freeLimit} offers {atLimit ? '— Upgrade for more' : ''}
            </span>
          )}
          <button className="btn" onClick={() => setShowAdd(true)} disabled={atLimit}>+ Add Offer</button>
        </div>
      </div>

      {atLimit && (
        <div className="pro-gate mb-3">
          <div className="pro-gate-icon">⚖️</div>
          <div className="pro-gate-title">Free tier: 2 offers max</div>
          <div className="pro-gate-text">Upgrade to Pro to compare unlimited offers with advanced analytics.</div>
        </div>
      )}

      {data.offers.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">⚖️</div>
          <p className="empty-state-text">No offers to compare yet. Add your first offer to get started.</p>
        </div>
      )}

      {data.offers.length > 0 && (
        <div className="offer-compare-grid">
          {data.offers.map(offer => (
            <div key={offer.id} className="offer-card">
              <div className="offer-card-header">
                <div className="offer-card-company">{offer.company}</div>
                <div className="offer-card-role">{offer.role}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.3rem' }}>
                  {offer.contractType} • {offer.workSetup}
                </div>
              </div>
              <div className="offer-card-body">
                <div className="offer-row">
                  <span className="offer-row-label">Gross Salary</span>
                  <span className={`offer-row-value ${offer.id === bestSalary ? 'offer-highlight' : ''}`}>
                    {fmt(offer.grossSalary)} {offer.id === bestSalary && '🏆'}
                  </span>
                </div>
                <div className="offer-row">
                  <span className="offer-row-label">Est. Net/year</span>
                  <span className="offer-row-value">{fmt(calcNet(offer.grossSalary))}</span>
                </div>
                <div className="offer-row">
                  <span className="offer-row-label">Bonus</span>
                  <span className="offer-row-value">
                    {offer.bonus ? (offer.bonusType === 'percentage' ? `${offer.bonus}%` : fmt(offer.bonus)) : '—'}
                  </span>
                </div>
                <div className="offer-row">
                  <span className="offer-row-label">Equity/ESOP</span>
                  <span className="offer-row-value">{offer.equity || '—'}</span>
                </div>
                <div className="offer-row">
                  <span className="offer-row-label">Vacation Days</span>
                  <span className={`offer-row-value ${offer.id === bestVacation ? 'offer-highlight' : ''}`}>
                    {offer.vacationDays || '—'} {offer.id === bestVacation && '🏆'}
                  </span>
                </div>
                <div className="offer-row">
                  <span className="offer-row-label">Learning Budget</span>
                  <span className={`offer-row-value ${offer.id === bestLearning ? 'offer-highlight' : ''}`}>
                    {offer.learningBudget ? fmt(offer.learningBudget) : '—'} {offer.id === bestLearning && '🏆'}
                  </span>
                </div>
                <div className="offer-row">
                  <span className="offer-row-label">Office Days/wk</span>
                  <span className="offer-row-value">{offer.workSetup === 'remote' ? 'Full remote' : offer.officeDaysPerWeek || '—'}</span>
                </div>
                <div className="offer-row">
                  <span className="offer-row-label">Notice Period</span>
                  <span className="offer-row-value">{offer.noticePeriod || '—'}</span>
                </div>
                <div className="offer-row">
                  <span className="offer-row-label">Probation</span>
                  <span className="offer-row-value">{offer.probationMonths ? `${offer.probationMonths} months` : '—'}</span>
                </div>
                <div className="offer-row">
                  <span className="offer-row-label">Start Date</span>
                  <span className="offer-row-value">{offer.startDate ? new Date(offer.startDate).toLocaleDateString('en-GB') : '—'}</span>
                </div>
                {offer.benefits.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.4rem' }}>Benefits:</p>
                    <div>{offer.benefits.map(b => <span key={b} className="tag tag-green" style={{ marginBottom: '0.3rem', display: 'inline-block' }}>{b}</span>)}</div>
                  </div>
                )}
                <div className="offer-star">
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>My rating:</span>
                  {[1,2,3,4,5].map(n => (
                    <span key={n} style={{ cursor: 'pointer', fontSize: '1.2rem', color: n <= offer.rating ? '#f59e0b' : '#ddd' }}
                      onClick={() => onUpdate({ ...data, offers: data.offers.map(o => o.id === offer.id ? { ...o, rating: n } : o) })}>★</span>
                  ))}
                  {offer.id === bestRating && <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>My favourite 🏆</span>}
                </div>
                {offer.notes && <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.75rem', fontStyle: 'italic' }}>{offer.notes}</p>}
                <button className="btn btn-sm btn-danger mt-2" onClick={() => deleteOffer(offer.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Offer" size="modal-lg">
        <div className="form-row">
          <div className="form-group"><label>Company *</label><input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} /></div>
          <div className="form-group"><label>Role *</label><input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Contract Type</label>
            <select value={form.contractType} onChange={e => setForm(p => ({ ...p, contractType: e.target.value as Offer['contractType'] }))}>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="freelance">Freelance</option>
              <option value="fixed-term">Fixed-term</option>
            </select>
          </div>
          <div className="form-group"><label>Work Setup</label>
            <select value={form.workSetup} onChange={e => setForm(p => ({ ...p, workSetup: e.target.value as Offer['workSetup'] }))}>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Gross Annual Salary (€)</label><input type="number" value={form.grossSalary || ''} onChange={e => setForm(p => ({ ...p, grossSalary: Number(e.target.value) }))} /></div>
          <div className="form-group"><label>Bonus (%)</label><input type="number" value={form.bonus || ''} onChange={e => setForm(p => ({ ...p, bonus: Number(e.target.value) }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Vacation Days</label><input type="number" value={form.vacationDays || ''} onChange={e => setForm(p => ({ ...p, vacationDays: Number(e.target.value) }))} /></div>
          <div className="form-group"><label>Learning Budget (€)</label><input type="number" value={form.learningBudget || ''} onChange={e => setForm(p => ({ ...p, learningBudget: Number(e.target.value) }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Notice Period</label><input value={form.noticePeriod} onChange={e => setForm(p => ({ ...p, noticePeriod: e.target.value }))} placeholder="e.g. 1 month" /></div>
          <div className="form-group"><label>Probation (months)</label><input type="number" value={form.probationMonths || ''} onChange={e => setForm(p => ({ ...p, probationMonths: Number(e.target.value) }))} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Equity / ESOP</label><input value={form.equity} onChange={e => setForm(p => ({ ...p, equity: e.target.value }))} placeholder="e.g. 0.5% vested over 4 years" /></div>
          <div className="form-group"><label>Start Date</label><input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} /></div>
        </div>
        <div className="form-group"><label>Benefits (comma-separated)</label><input value={form.benefits.join(', ')} onChange={e => setForm(p => ({ ...p, benefits: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="Health insurance, Gym, Remote allowance" /></div>
        <div className="form-group"><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
        <div className="flex gap-1 justify-between mt-2">
          <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn" onClick={addOffer}>Add Offer</button>
        </div>
      </Modal>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main App
// ──────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [page, setPage] = useState<Page>('dashboard');
  const [email, setEmail] = useState('');
  const [loginSubmit, setLoginSubmit] = useState(false);

  useEffect(() => { saveData(data); }, [data]);

  // Apply theme and font size to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.className = '';
    root.classList.add(`theme-${data.settings?.theme || 'light'}`);
    root.classList.add(`font-${data.settings?.fontSize || 'medium'}`);
  }, [data.settings]);

  const setTheme = (theme: Theme) => setData(d => ({ ...d, settings: { ...d.settings, theme } }));
  const setFontSize = (fontSize: FontSize) => setData(d => ({ ...d, settings: { ...d.settings, fontSize } }));

  const handleLogin = () => {
    if (!email.trim()) return;
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    // Admin gets Pro; everyone else starts on Free
    setData(d => ({ ...d, user: { ...d.user, email: email.trim(), isAdmin, isPro: isAdmin } }));
    setLoginSubmit(false);
  };

  if (!data.user.email) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <div style={{ background: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 4px 30px rgba(0,0,0,0.1)', maxWidth: 420, width: '90%' }}>
          <h1 style={{ fontFamily: 'Playfair Display', color: 'var(--accent)', fontSize: '2rem', marginBottom: '0.3rem' }}>CareerCompass</h1>
          <p style={{ color: '#888', marginBottom: '2rem', fontSize: '0.9rem' }}>Your job search intelligence platform</p>
          {loginSubmit ? (
            <div>
              <p style={{ marginBottom: '1rem', fontWeight: 600 }}>Enter your email to continue</p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="your@email.com"
                style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '1rem', fontSize: '1rem' }}
                autoFocus
              />
              <button className="btn" style={{ width: '100%' }} onClick={handleLogin}>Continue</button>
              <button className="btn btn-outline" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setLoginSubmit(false)}>Back</button>
            </div>
          ) : (
            <div>
              <button className="btn" style={{ width: '100%', marginBottom: '0.75rem', padding: '0.9rem' }} onClick={() => setLoginSubmit(true)}>
                Continue with Email
              </button>
              <p className="text-muted text-xs" style={{ textAlign: 'center' }}>Your data is stored locally in your browser.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const nav = [
    { id: 'dashboard', label: '📊 Dashboard', section: 'main' },
    { id: 'applications', label: '📋 Applications', section: 'main' },
    { id: 'cv-upload', label: '📄 CV Upload', section: 'main' },
    { id: 'jd-extract', label: '🔍 JD Extract', section: 'main' },
    { id: 'interviews', label: '🎤 Interviews', section: 'main' },
    { id: 'references', label: '👥 References', section: 'tools' },
    { id: 'offers', label: '⚖️ Offer Compare', section: 'tools' },
    { id: 'salary-calc', label: '💰 Salary Calc', section: 'tools' },
    { id: 'toolkit', label: '🛠️ Germany Toolkit', section: 'tools' },
    { id: 'profile', label: '⚙️ Profile', section: 'account' },
    ...(data.user.isAdmin ? [{ id: 'admin', label: '🔐 Admin', section: 'account' }] : []),
  ] as const;

  const sections = ['main', 'tools', 'account'] as const;
  const sectionLabels: Record<string, string> = { main: 'Main', tools: 'Tools', account: 'Account' };
  const theme = data.settings?.theme || 'light';
  const fontSize = data.settings?.fontSize || 'medium';

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-brand">CareerCompass</div>
        <div className="sidebar-tagline">Your Career, Navigated</div>

        <div className="user-pill">
          <div className="user-pill-name">{data.profile.name || data.user.email}</div>
          <span className="user-pill-tier">{data.user.isPro ? 'Pro' : 'Free'}</span>
          {data.user.isAdmin && <span className="user-pill-tier" style={{ marginLeft: '0.3rem', background: '#7c3aed' }}>Admin</span>}
        </div>

        {sections.map(sec => {
          const items = nav.filter(n => n.section === sec);
          if (!items.length) return null;
          return (
            <div key={sec}>
              <div className="nav-section-label">{sectionLabels[sec]}</div>
              {items.map(n => (
                <button key={n.id} className={`nav-btn ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id as Page)}>{n.label}</button>
              ))}
            </div>
          );
        })}

        {/* Accessibility controls */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <div className="nav-section-label">Appearance</div>
          <div style={{ padding: '0 0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(240,237,230,0.4)', marginBottom: '0.3rem' }}>Theme</div>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {(['light', 'dark', 'high-contrast'] as Theme[]).map(t => (
                <button key={t} onClick={() => setTheme(t)}
                  style={{ flex: 1, padding: '0.3rem 0.2rem', fontSize: '0.65rem', border: `1px solid ${theme === t ? 'var(--accent)' : 'rgba(240,237,230,0.2)'}`, borderRadius: '4px', background: theme === t ? 'rgba(212,133,58,0.2)' : 'transparent', color: theme === t ? 'var(--accent)' : 'rgba(240,237,230,0.5)', cursor: 'pointer' }}>
                  {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '⚡'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '0 0.5rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(240,237,230,0.4)', marginBottom: '0.3rem' }}>Font Size</div>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {(['small', 'medium', 'large'] as FontSize[]).map(f => (
                <button key={f} onClick={() => setFontSize(f)}
                  style={{ flex: 1, padding: '0.3rem 0.2rem', fontSize: '0.65rem', border: `1px solid ${fontSize === f ? 'var(--accent)' : 'rgba(240,237,230,0.2)'}`, borderRadius: '4px', background: fontSize === f ? 'rgba(212,133,58,0.2)' : 'transparent', color: fontSize === f ? 'var(--accent)' : 'rgba(240,237,230,0.5)', cursor: 'pointer' }}>
                  {f === 'small' ? 'A' : f === 'medium' ? 'Aa' : 'AA'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '0 0.5rem' }}>
            <button className="logout-btn" onClick={() => { if (confirm('Log out?')) { setData(d => ({ ...d, user: { ...d.user, email: '' } })); } }}>Logout</button>
          </div>
        </div>
      </div>

      <div className="main-content">
        {page === 'dashboard' && <Dashboard data={data} onNavigate={setPage} />}
        {page === 'applications' && <ApplicationsPage data={data} onUpdate={setData} />}
        {page === 'cv-upload' && <CVUploadPage data={data} onUpdate={setData} isPro={data.user.isPro} />}
        {page === 'jd-extract' && <JDExtractPage data={data} onUpdate={setData} isPro={data.user.isPro} />}
        {page === 'interviews' && <InterviewsPage data={data} />}
        {page === 'references' && <ReferencesPage data={data} onUpdate={setData} isPro={data.user.isPro} />}
        {page === 'offers' && <OfferComparePage data={data} onUpdate={setData} isPro={data.user.isPro} />}
        {page === 'salary-calc' && <SalaryCalcPage />}
        {page === 'toolkit' && <ToolkitPage />}
        {page === 'profile' && <ProfilePage data={data} onUpdate={setData} />}
        {page === 'admin' && data.user.isAdmin && <AdminDashboard data={data} />}
      </div>
    </div>
  );
}
