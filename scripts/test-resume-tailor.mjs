import {
  buildOnePageResume,
  buildTailoring,
  parseResumeSections,
} from '../src/lib/resumeTailor.js';
import {
  SAMPLE_COMPANY,
  SAMPLE_JOB_REQUIREMENTS,
  SAMPLE_JOB_TITLE,
  SAMPLE_RESUME_TEXT,
} from '../src/lib/resumeTailorSamples.js';

const parsed = parseResumeSections(SAMPLE_RESUME_TEXT);

const tailoring = buildTailoring({
  jobTitle: SAMPLE_JOB_TITLE,
  company: SAMPLE_COMPANY,
  jobText: SAMPLE_JOB_REQUIREMENTS,
  baseSummary: parsed.summary,
  baseExperience: parsed.experienceText,
  skills: (parsed.skillsText || '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
});

const onePage = buildOnePageResume({
  header: 'YOUR NAME\nCity, ST • (555) 555-5555 • you@email.com • linkedin.com/in/yourname',
  jobTitle: SAMPLE_JOB_TITLE,
  company: SAMPLE_COMPANY,
  jobText: SAMPLE_JOB_REQUIREMENTS,
  resumeText: SAMPLE_RESUME_TEXT,
  baseSummary: parsed.summary,
  skillsText: parsed.skillsText,
  baseExperience: parsed.experienceText,
});

const wordCount = onePage.split(/\s+/).filter(Boolean).length;

console.log('== Resume Tailor Console Test ==');
console.log(`Role: ${SAMPLE_JOB_TITLE} @ ${SAMPLE_COMPANY}`);
console.log(`Parsed requirements: ${tailoring.requirements.length}`);
console.log(`ATS keywords: ${tailoring.atsCoveredCount}/${tailoring.atsTotalCount} covered (simple check)`);
console.log(`One-page word count: ${wordCount}`);
console.log('\n--- ONE-PAGE RESUME DRAFT ---\n');
console.log(onePage);

