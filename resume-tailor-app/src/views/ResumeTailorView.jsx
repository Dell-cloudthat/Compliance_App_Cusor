import React, { useMemo, useState } from 'react';
import { buildOnePageResume, buildTailoring, parseResumeSections, parseSkills } from '@/lib/resumeTailor';
import { extractTextFromFile } from '@/lib/fileText';
import { CheckCircle, Copy, FileText, Sparkles, Upload, XCircle } from 'lucide-react';
import {
  SAMPLE_COMPANY,
  SAMPLE_JOB_REQUIREMENTS,
  SAMPLE_JOB_TITLE,
  SAMPLE_RESUME_TEXT,
} from '@/lib/resumeTailorSamples';

function coverageBadge(coverage) {
  if (coverage === 'strong') return 'bg-green-500/10 text-green-500 border-green-500/20';
  if (coverage === 'partial') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  return 'bg-red-500/10 text-red-500 border-red-500/20';
}

function coverageLabel(coverage) {
  if (coverage === 'strong') return 'Strong match';
  if (coverage === 'partial') return 'Partial match';
  return 'Gap';
}

function safeClipboardWrite(text) {
  if (!text) return Promise.resolve(false);
  if (navigator?.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  return Promise.resolve(false);
}

export default function ResumeTailorView() {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobText, setJobText] = useState('');

  const [jobUploadName, setJobUploadName] = useState('');
  const [resumeUploadName, setResumeUploadName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  const [headerText, setHeaderText] = useState('[YOUR NAME]\n[City, ST] • [Phone] • [Email] • [LinkedIn/GitHub]');
  const [resumeRawText, setResumeRawText] = useState('');

  const [baseSummary, setBaseSummary] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [baseExperience, setBaseExperience] = useState('');

  const [suggestionOverrides, setSuggestionOverrides] = useState({});
  const [copied, setCopied] = useState(false);
  const [onePageOverride, setOnePageOverride] = useState('');
  const [onePageTouched, setOnePageTouched] = useState(false);

  const skills = useMemo(() => parseSkills(skillsText), [skillsText]);
  const tailoring = useMemo(
    () => buildTailoring({ jobTitle, company, jobText, baseSummary, baseExperience, skills }),
    [jobTitle, company, jobText, baseSummary, baseExperience, skills]
  );

  const requirements = tailoring.requirements.map((r) => ({
    ...r,
    suggestion: suggestionOverrides[r.id] ?? r.suggestion,
  }));

  const autoOnePage = useMemo(() => {
    return buildOnePageResume({
      header: headerText,
      jobTitle,
      company,
      jobText,
      resumeText: resumeRawText,
      baseSummary,
      skillsText,
      baseExperience,
    });
  }, [headerText, jobTitle, company, jobText, resumeRawText, baseSummary, skillsText, baseExperience]);

  const onePageText = onePageTouched ? onePageOverride : autoOnePage;

  const handleCopy = async () => {
    const ok = await safeClipboardWrite(onePageText?.trim() ? onePageText : '');
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1200);
  };

  const handleUploadResume = async (file) => {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const text = await extractTextFromFile(file);
      setResumeUploadName(file.name || 'resume');
      setResumeRawText(text);

      const parsed = parseResumeSections(text);
      if (parsed.summary && !baseSummary) setBaseSummary(parsed.summary);
      if (parsed.skillsText && !skillsText) setSkillsText(parsed.skillsText);
      if (parsed.experienceText && !baseExperience) setBaseExperience(parsed.experienceText);

      setOnePageTouched(false);
      setOnePageOverride('');
    } catch (e) {
      setUploadError(e?.message || String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleUploadJob = async (file) => {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const text = await extractTextFromFile(file);
      setJobUploadName(file.name || 'job-requirements');
      setJobText(text);
      setOnePageTouched(false);
      setOnePageOverride('');
    } catch (e) {
      setUploadError(e?.message || String(e));
    } finally {
      setUploading(false);
    }
  };

  const loadSample = () => {
    setUploadError('');
    setJobTitle(SAMPLE_JOB_TITLE);
    setCompany(SAMPLE_COMPANY);
    setJobText(SAMPLE_JOB_REQUIREMENTS);

    setResumeRawText(SAMPLE_RESUME_TEXT);
    const parsed = parseResumeSections(SAMPLE_RESUME_TEXT);
    setBaseSummary(parsed.summary || '');
    setSkillsText(parsed.skillsText || '');
    setBaseExperience(parsed.experienceText || '');

    setResumeUploadName('sample_resume.txt');
    setJobUploadName('sample_job.txt');

    setOnePageTouched(false);
    setOnePageOverride('');
    setSuggestionOverrides({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Resume Tailor (Requirement-by-Requirement)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your resume + job requirements (or paste). The tool extracts both, compares them, and generates a concise one-page tailored resume you can edit.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied' : 'Copy resume'}
        </button>
      </div>

      <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-muted-foreground" />
              Upload inputs (optional)
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Supported: TXT, PDF, DOCX. Uploading will auto-fill the fields below (you can still edit everything).
            </div>
          </div>
          {uploading && (
            <div className="text-xs text-muted-foreground">Extracting text…</div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Want to test immediately? Load a sample resume + job posting and confirm the 1-page output updates.
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={loadSample}
            className="px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 border border-[hsl(var(--border))] text-xs text-foreground transition-colors disabled:opacity-60"
          >
            Load sample data
          </button>
        </div>

        {uploadError ? (
          <div className="mt-3 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-sm">
            {uploadError}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-background/20">
            <div className="text-xs text-muted-foreground mb-2">Resume upload</div>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              disabled={uploading}
              onChange={(e) => handleUploadResume(e.target.files?.[0])}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-muted/50 file:text-foreground hover:file:bg-muted/70"
            />
            <div className="mt-2 text-xs text-muted-foreground">
              {resumeUploadName ? <>Loaded: <span className="text-foreground">{resumeUploadName}</span></> : 'No file uploaded.'}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-background/20">
            <div className="text-xs text-muted-foreground mb-2">Job requirements upload</div>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              disabled={uploading}
              onChange={(e) => handleUploadJob(e.target.files?.[0])}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-muted/50 file:text-foreground hover:file:bg-muted/70"
            />
            <div className="mt-2 text-xs text-muted-foreground">
              {jobUploadName ? <>Loaded: <span className="text-foreground">{jobUploadName}</span></> : 'No file uploaded.'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Job posting inputs
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Job title</label>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-[hsl(var(--border))] text-foreground"
                placeholder="e.g., GRC Analyst / Security Engineer"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Company</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-[hsl(var(--border))] text-foreground"
                placeholder="e.g., Acme Corp"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Job description / requirements</label>
            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              className="mt-1 w-full min-h-[220px] px-3 py-2 rounded-lg bg-background border border-[hsl(var(--border))] text-foreground"
              placeholder="Paste the job posting here (responsibilities, requirements, etc.)"
            />
          </div>
        </div>

        <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
            Your base resume inputs
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Header (name + contact)</label>
            <textarea
              value={headerText}
              onChange={(e) => {
                setHeaderText(e.target.value);
                setOnePageTouched(false);
              }}
              className="mt-1 w-full min-h-[78px] px-3 py-2 rounded-lg bg-background border border-[hsl(var(--border))] text-foreground"
              placeholder="[Your Name]&#10;[City, ST] • [Phone] • [Email] • [LinkedIn]"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Base summary (paste your current summary)</label>
            <textarea
              value={baseSummary}
              onChange={(e) => setBaseSummary(e.target.value)}
              className="mt-1 w-full min-h-[92px] px-3 py-2 rounded-lg bg-background border border-[hsl(var(--border))] text-foreground"
              placeholder="Paste your existing professional summary here."
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Skills (comma or newline separated)</label>
            <textarea
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              className="mt-1 w-full min-h-[92px] px-3 py-2 rounded-lg bg-background border border-[hsl(var(--border))] text-foreground"
              placeholder="e.g., NIST 800-53, SOC 2, AWS, Python, SIEM, Risk assessments"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Base experience bullets (paste; keep it raw)</label>
            <textarea
              value={baseExperience}
              onChange={(e) => setBaseExperience(e.target.value)}
              className="mt-1 w-full min-h-[150px] px-3 py-2 rounded-lg bg-background border border-[hsl(var(--border))] text-foreground"
              placeholder="- Bullet 1&#10;- Bullet 2&#10;- Bullet 3"
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Ultimate 1-page tailored resume (editable)</h2>
            <p className="text-xs text-muted-foreground mt-1">
              This draft is generated from your uploaded/pasted resume + the job requirements. Edit for accuracy and add metrics.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Est. words: <span className="text-foreground font-medium">{onePageText.split(/\s+/).filter(Boolean).length}</span>
          </div>
        </div>

        <textarea
          value={onePageText}
          onChange={(e) => {
            setOnePageOverride(e.target.value);
            setOnePageTouched(true);
          }}
          className="w-full min-h-[260px] px-3 py-2 rounded-lg bg-background border border-[hsl(var(--border))] text-foreground font-mono text-sm"
        />

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Tip: keep this under ~550–600 words to stay close to 1 page in most templates.
          </div>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 border border-[hsl(var(--border))] text-xs text-foreground transition-colors"
            onClick={() => {
              setOnePageTouched(false);
              setOnePageOverride('');
            }}
            title="Regenerate from current inputs"
          >
            Regenerate
          </button>
        </div>
      </div>

      <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Requirements → tailored bullets</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Edit each draft bullet to reflect your real work (metrics, scope, tools). Keep it truthful—this is for interview alignment.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Parsed requirements: <span className="text-foreground font-medium">{requirements.length}</span>
          </div>
        </div>

        {requirements.length === 0 ? (
          <div className="p-6 rounded-lg border border-[hsl(var(--border))] bg-muted/10 text-muted-foreground text-sm">
            Paste a job description on the left to generate requirement-by-requirement tailoring.
          </div>
        ) : (
          <div className="space-y-3">
            {requirements.map((r, idx) => (
              <div key={r.id} className="rounded-xl border border-[hsl(var(--border))] bg-background/30 overflow-hidden">
                <div className="p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-md bg-muted/40 border border-[hsl(var(--border))] text-muted-foreground">
                        R{idx + 1}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-md border ${coverageBadge(r.coverage)}`}>
                        {coverageLabel(r.coverage)}
                      </span>
                    </div>
                    <div className="text-sm text-foreground">{r.text}</div>
                    <div className="flex flex-wrap gap-2">
                      {(r.matchedSkills?.length ? r.matchedSkills : []).slice(0, 6).map((s) => (
                        <span key={s} className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {s}
                        </span>
                      ))}
                      {(!r.matchedSkills || r.matchedSkills.length === 0) && (
                        <span className="text-xs px-2 py-1 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          No matching skills detected yet
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="md:self-start px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 border border-[hsl(var(--border))] text-xs text-foreground transition-colors"
                    onClick={() => setSuggestionOverrides((prev) => {
                      const next = { ...prev };
                      delete next[r.id];
                      return next;
                    })}
                    title="Reset to default suggestion"
                  >
                    Reset draft
                  </button>
                </div>

                <div className="px-4 pb-4">
                  <label className="text-xs text-muted-foreground">Draft bullet (editable)</label>
                  <textarea
                    value={r.suggestion}
                    onChange={(e) => setSuggestionOverrides((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    className="mt-1 w-full min-h-[82px] px-3 py-2 rounded-lg bg-background border border-[hsl(var(--border))] text-foreground"
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    Tip: replace <span className="text-foreground">[measurable impact]</span> with numbers (time saved, $ saved, risk reduced, uptime, tickets closed).
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

