const STOPWORDS = new Set([
  'a','an','the','and','or','but','if','then','else','when','while','to','of','in','on','for','with','by','from',
  'is','are','was','were','be','been','being','as','at','it','its','this','that','these','those','you','your','we',
  'our','they','their','i','me','my','us','them','he','she','his','her','will','can','may','must','should','would',
  'could','into','over','under','about','across','per','via','etc','e.g','eg','i.e','ie',
  'responsibilities','responsibility','requirements','required','preferred','plus'
]);

function normalizeText(input = '') {
  return String(input)
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-') // en/em dash
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(input = '') {
  const text = normalizeText(input);
  if (!text) return [];
  return text
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/^[\-\d.]+/, '')) // remove leading bullet/number artifacts
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

export function extractRequirements(jobText = '') {
  const raw = String(jobText || '').trim();
  if (!raw) return [];

  // Prefer line-based parsing if there are clear bullet lines.
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^(\*|-|•)\s+/, ''))
    .map((l) => l.replace(/^\d+[\).]\s+/, ''));

  const bulletLike = lines.filter((l) => l.length >= 10);
  if (bulletLike.length >= 3) return bulletLike;

  // Fallback: sentence-ish splits.
  return raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20)
    .slice(0, 25);
}

export function extractTopKeywords(text = '', limit = 20) {
  const tokens = tokenize(text);
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

export function parseSkills(skillsText = '') {
  const raw = String(skillsText || '').trim();
  if (!raw) return [];
  const parts = raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  // De-dupe while preserving order.
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const key = normalizeText(p);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function overlapScore(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const bSet = new Set(bTokens);
  let hit = 0;
  for (const t of aTokens) if (bSet.has(t)) hit += 1;
  return hit / Math.max(3, Math.min(aTokens.length, 12));
}

export function matchSkillsToRequirement(requirementText = '', skills = []) {
  const reqNorm = normalizeText(requirementText);
  const reqTokens = tokenize(requirementText);
  if (!reqNorm) return { matchedSkills: [], score: 0, keywords: [] };

  const matched = [];
  const keywordHits = new Set();

  for (const skill of skills) {
    const sNorm = normalizeText(skill);
    if (!sNorm) continue;

    const direct = reqNorm.includes(sNorm) || sNorm.includes(reqNorm);
    const sTokens = tokenize(skill);
    const score = direct ? 0.9 : overlapScore(reqTokens, sTokens);

    if (score >= 0.35) {
      matched.push({ skill, score });
      for (const t of sTokens) keywordHits.add(t);
    }
  }

  matched.sort((a, b) => b.score - a.score);
  const topSkills = matched.map((m) => m.skill).slice(0, 6);

  // Keep a handful of requirement keywords, biased toward matched skill tokens.
  const topReqKeywords = extractTopKeywords(requirementText, 10).map((k) => k.term);
  const combinedKeywords = [
    ...[...keywordHits].slice(0, 8),
    ...topReqKeywords.filter((k) => !keywordHits.has(k)).slice(0, 8),
  ].slice(0, 10);

  const overallScore = matched.length
    ? Math.min(1, matched[0].score + Math.min(0.35, matched.length * 0.05))
    : overlapScore(reqTokens, tokenize(skills.join(' ')));

  return { matchedSkills: topSkills, score: overallScore, keywords: combinedKeywords };
}

const ACTION_VERBS = [
  'Delivered',
  'Implemented',
  'Built',
  'Led',
  'Owned',
  'Automated',
  'Optimized',
  'Hardened',
  'Designed',
  'Improved',
  'Reduced',
  'Scaled',
  'Standardized',
  'Integrated',
  'Developed',
];

function pickVerb(seed = '') {
  const t = tokenize(seed).join('');
  let hash = 0;
  for (let i = 0; i < t.length; i += 1) hash = (hash * 31 + t.charCodeAt(i)) % 9973;
  return ACTION_VERBS[hash % ACTION_VERBS.length];
}

export function suggestBullet(requirementText = '', matchedSkills = []) {
  const verb = pickVerb(requirementText);
  const skillPhrase = matchedSkills.length ? ` using ${matchedSkills.slice(0, 3).join(', ')}` : '';
  return `${verb} ${requirementText.replace(/\.$/, '')}${skillPhrase}, resulting in [measurable impact].`;
}

export function buildTailoring({ jobTitle = '', company = '', jobText = '', baseSummary = '', baseExperience = '', skills = [] }) {
  const requirements = extractRequirements(jobText).map((text, idx) => {
    const { matchedSkills, score, keywords } = matchSkillsToRequirement(text, skills);
    const coverage = score >= 0.7 ? 'strong' : score >= 0.4 ? 'partial' : 'gap';
    return {
      id: `req-${idx + 1}`,
      text,
      matchedSkills,
      keywords,
      score,
      coverage,
      suggestion: suggestBullet(text, matchedSkills),
    };
  });

  const ats = extractTopKeywords(jobText, 24);
  const baseText = `${baseSummary}\n${baseExperience}\n${skills.join(', ')}`;
  const baseNorm = normalizeText(baseText);
  const coveredKeywords = ats.filter((k) => baseNorm.includes(k.term));

  const topSkills = requirements
    .flatMap((r) => r.matchedSkills)
    .filter(Boolean);
  const skillCounts = new Map();
  for (const s of topSkills) skillCounts.set(s, (skillCounts.get(s) || 0) + 1);
  const tailoredSkills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([skill]) => skill);

  const roleLine = jobTitle ? `Target role: ${jobTitle}` : 'Target role: (enter job title)';
  const orgLine = company ? `Target company: ${company}` : 'Target company: (enter company)';
  const summaryFocus = tailoredSkills.slice(0, 6).join(', ');
  const tailoredSummary =
    `\n${roleLine}\n${orgLine}\n\n` +
    `Summary:\n` +
    `Results-driven professional aligned to this role, with strengths in ${summaryFocus || 'core delivery, collaboration, and execution'}. ` +
    `Experienced translating requirements into shipped outcomes and measurable improvements.\n`;

  return {
    requirements,
    atsKeywords: ats,
    atsCoveredCount: coveredKeywords.length,
    atsTotalCount: ats.length,
    tailoredSkills,
    tailoredSummary,
  };
}

function isLikelyHeading(line) {
  const t = String(line || '').trim();
  if (!t) return false;
  if (t.length > 60) return false;
  const upper = t.toUpperCase();
  const ratio = upper === t ? 1 : 0;
  return ratio === 1 && /^[A-Z0-9 &/.-]+$/.test(t);
}

function findSectionStart(lines, candidates) {
  const cand = candidates.map((c) => normalizeText(c));
  for (let i = 0; i < lines.length; i += 1) {
    const n = normalizeText(lines[i]);
    if (!n) continue;
    if (cand.some((c) => n === c || n.includes(c))) return i;
  }
  return -1;
}

function collectUntilNextHeading(lines, startIdx) {
  const out = [];
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    const line = String(lines[i] || '').trimEnd();
    if (!line) {
      if (out.length >= 2) break;
      continue;
    }
    if (isLikelyHeading(line)) break;
    out.push(line);
    if (out.join(' ').length > 900) break;
  }
  return out;
}

export function parseResumeSections(resumeText = '') {
  const raw = String(resumeText || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return { summary: '', skillsText: '', experienceText: '' };

  const lines = raw
    .split('\n')
    .map((l) => l.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((l) => l !== '');

  const summaryIdx = findSectionStart(lines, ['summary', 'professional summary', 'profile']);
  const skillsIdx = findSectionStart(lines, ['skills', 'technical skills', 'core skills', 'competencies']);
  const expIdx = findSectionStart(lines, ['experience', 'work experience', 'professional experience', 'employment']);

  const summaryLines = summaryIdx >= 0 ? collectUntilNextHeading(lines, summaryIdx) : [];
  const skillsLines = skillsIdx >= 0 ? collectUntilNextHeading(lines, skillsIdx) : [];
  const expLines = expIdx >= 0 ? collectUntilNextHeading(lines, expIdx) : [];

  const summary = summaryLines.length
    ? summaryLines.join('\n').trim()
    : lines.slice(0, 6).join(' ').slice(0, 600).trim();

  const skillsText = skillsLines.length
    ? skillsLines.join('\n').replace(/•/g, ', ').trim()
    : '';

  // Prefer bullet-like experience lines; fallback to a chunk of resume text.
  const expBullets = expLines.filter((l) => /^(\*|-|•)\s+/.test(l)).map((l) => l.replace(/^(\*|-|•)\s+/, ''));
  const experienceText = expBullets.length
    ? expBullets.map((b) => `- ${b}`).join('\n')
    : (expLines.length ? expLines.join('\n') : raw).slice(0, 3500).trim();

  return { summary, skillsText, experienceText };
}

function extractBullets(text = '') {
  const raw = String(text || '').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets = lines
    .filter((l) => /^(\*|-|•)\s+/.test(l) || /^\d+[\).]\s+/.test(l))
    .map((l) => l.replace(/^(\*|-|•)\s+/, '').replace(/^\d+[\).]\s+/, ''))
    .filter((l) => l.length >= 12);
  if (bullets.length >= 3) return bullets;
  // Fallback: split into sentences and treat as bullet candidates.
  return raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 35 && s.length <= 220)
    .slice(0, 24);
}

function scoreTextAgainstKeywords(text, keywordSet) {
  const tokens = tokenize(text);
  if (!tokens.length) return 0;
  let hit = 0;
  for (const t of tokens) if (keywordSet.has(t)) hit += 1;
  return hit / Math.max(6, Math.min(tokens.length, 16));
}

function clampWords(text, maxWords) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return String(text || '').trim();
  return words.slice(0, maxWords).join(' ').trim();
}

export function buildOnePageResume({
  header = '[YOUR NAME]\n[City, ST] • [Phone] • [Email] • [LinkedIn/GitHub]',
  jobTitle = '',
  company = '',
  jobText = '',
  resumeText = '',
  baseSummary = '',
  skillsText = '',
  baseExperience = '',
  maxWords = 575,
} = {}) {
  const skills = parseSkills(skillsText);
  const tailoring = buildTailoring({ jobTitle, company, jobText, baseSummary, baseExperience, skills });

  const jdKeywords = new Set(tailoring.atsKeywords.map((k) => k.term));
  const candidateBullets = extractBullets(baseExperience || resumeText);
  const rankedBullets = candidateBullets
    .map((b) => ({ b, score: scoreTextAgainstKeywords(b, jdKeywords) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.b);

  const pickedBullets = rankedBullets.slice(0, 7);
  const summaryLine = clampWords(
    `Aligned to ${jobTitle || 'this role'}${company ? ` at ${company}` : ''}. ` +
      `Strengths in ${tailoring.tailoredSkills.slice(0, 8).join(', ') || skills.slice(0, 8).join(', ') || 'delivery, collaboration, and execution'}. ` +
      `Known for translating requirements into measurable outcomes.`,
    65
  );

  const skillLine = (tailoring.tailoredSkills.length ? tailoring.tailoredSkills : skills).slice(0, 18).join(' • ');

  const lines = [];
  lines.push(String(header || '').trim());
  lines.push('');
  if (jobTitle || company) lines.push(`Target: ${jobTitle || '[Job Title]'}${company ? ` • ${company}` : ''}`);
  lines.push('');
  lines.push('SUMMARY');
  lines.push(summaryLine);
  lines.push('');
  lines.push('SKILLS');
  lines.push(skillLine || '[Add skills]');
  lines.push('');
  lines.push('EXPERIENCE HIGHLIGHTS');
  if (!pickedBullets.length) {
    lines.push('- [Paste experience bullets or upload resume]');
  } else {
    pickedBullets.forEach((b) => lines.push(`- ${b}`));
  }

  // Enforce word cap by trimming bullets if needed.
  let out = lines.join('\n').trim();
  let words = out.split(/\s+/).filter(Boolean).length;
  if (words > maxWords) {
    const keep = Math.max(3, Math.min(7, Math.floor((maxWords - 170) / 22)));
    const reduced = lines.filter((l) => !l.startsWith('- ')).concat(pickedBullets.slice(0, keep).map((b) => `- ${b}`));
    out = reduced.join('\n').trim();
    words = out.split(/\s+/).filter(Boolean).length;
    if (words > maxWords) out = clampWords(out, maxWords);
  }
  return out;
}

