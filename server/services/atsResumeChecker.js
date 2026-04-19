import fs from 'fs/promises';
import path from 'path';

const ATS_AI_API_URL =
  process.env.AI_API_BASE ||
  process.env.HUGGINGFACE_INFERENCE_URL ||
  'https://router.huggingface.co/v1/chat/completions';
const ATS_AI_MODEL =
  process.env.AI_MODEL ||
  process.env.HUGGINGFACE_MODEL_ID ||
  'meta-llama/Meta-Llama-3-8B-Instruct';
const ATS_AI_API_KEY =
  process.env.AI_API_KEY ||
  process.env.HF_TOKEN ||
  process.env.HUGGINGFACE_API_TOKEN ||
  '';
const ATS_PROMPT_VERSION = 'ats-v1';
const ATS_AI_TEMPERATURE = Number.parseFloat(process.env.ATS_AI_TEMPERATURE || '0.2');
const ATS_AI_MAX_OUTPUT_TOKENS = Number.parseInt(process.env.ATS_AI_MAX_OUTPUT_TOKENS || '1800', 10);
const ATS_INPUT_CHAR_LIMIT = Number.parseInt(process.env.ATS_INPUT_CHAR_LIMIT || '18000', 10);

const COMMON_SKILL_KEYWORDS = [
  'javascript', 'typescript', 'react', 'node.js', 'node', 'python', 'java', 'sql',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'rest api', 'graphql', 'mongodb',
  'postgresql', 'mysql', 'git', 'agile', 'scrum', 'leadership', 'communication',
  'project management', 'data analysis', 'excel', 'power bi', 'tableau', 'machine learning',
  'customer service', 'sales', 'crm', 'seo', 'content marketing', 'figma', 'ui/ux',
  'testing', 'ci/cd', 'devops', 'linux', 'firebase', 'supabase', 'next.js', 'vue',
  'angular', 'c++', 'c#', '.net', 'tailwind', 'html', 'css', 'redux', 'express',
  'fastapi', 'django', 'flask', 'php', 'laravel', 'shopify', 'wordpress', 'canva',
  'recruitment', 'patient care', 'teaching', 'administration', 'operations',
];

const ACTION_VERBS = [
  'built', 'developed', 'led', 'managed', 'created', 'implemented', 'designed', 'delivered',
  'improved', 'optimized', 'coordinated', 'supported', 'executed', 'launched', 'analyzed',
  'streamlined', 'reduced', 'increased', 'trained', 'mentored', 'provided', 'maintained',
  'collaborated', 'organized', 'oversaw', 'resolved', 'directed',
];

const CLICHE_PATTERNS = [
  /responsible for/gi,
  /hardworking/gi,
  /team player/gi,
  /go-getter/gi,
  /detail-oriented/gi,
  /results-driven/gi,
];

const clampScore = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
};

const scoreBandFromScore = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Average';
  return 'Poor';
};

const cleanText = (value) => {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .trim();
};

const truncateText = (value, maxChars = ATS_INPUT_CHAR_LIMIT) => {
  const normalized = cleanText(value);
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}\n\n[truncated]`;
};

const cleanList = (value, fallback = []) => {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 12);
};

const normalizeBoolean = (value) => value === true;

const statusFromCategoryScore = (score, max) => {
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.9) return 'Excellent';
  if (ratio >= 0.7) return 'Good';
  if (ratio >= 0.45) return 'Needs Work';
  return 'Poor';
};

const normalizeWhitespace = (value) => {
  return cleanText(value).replace(/\s+/g, ' ');
};

const pickKeywordsFromText = (text) => {
  const haystack = ` ${cleanText(text).toLowerCase()} `;
  return COMMON_SKILL_KEYWORDS.filter((keyword) => haystack.includes(` ${keyword.toLowerCase()} `));
};

const detectContactSignals = (resumeText) => {
  const normalized = cleanText(resumeText);
  const compact = normalized.replace(/\s+/g, ' ');
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const firstLine = lines[0] || '';

  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(compact);
  const hasPhone = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/.test(compact);
  const hasLinkedIn = /linkedin\.com\/in\//i.test(compact);
  const hasName = /^[A-Za-z][A-Za-z'.-]+(?:\s+[A-Za-z][A-Za-z'.-]+){1,3}$/.test(firstLine);

  const issues = [];
  if (!hasName) issues.push('Add your full name clearly at the top of the resume.');
  if (!hasEmail) issues.push('Add a professional email address.');
  if (!hasPhone) issues.push('Add a phone number in a standard format.');
  if (!hasLinkedIn) issues.push('Add a LinkedIn profile URL.');

  return {
    issues,
    score: Math.max(0, 100 - (issues.length * 25)),
  };
};

const estimatePageCount = (resumeText) => {
  const words = cleanText(resumeText).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round((words / 450) * 10) / 10);
};

const buildHeuristicReport = (resumeText, jobDescription) => {
  const normalizedResume = cleanText(resumeText);
  const resumeWords = normalizedResume.split(/\s+/).filter(Boolean).length;
  const pageCount = estimatePageCount(normalizedResume);
  const detectedKeywords = pickKeywordsFromText(normalizedResume);
  const targetKeywords = pickKeywordsFromText(jobDescription);
  const missingKeywords = targetKeywords.filter((keyword) => !detectedKeywords.includes(keyword));
  const hasSummarySection = /\bsummary\b|\bobjective\b|\bprofile\b/i.test(normalizedResume);
  const hasExperienceSection = experienceTextLike(normalizedResume);
  const hasEducationSection = educationLike(normalizedResume);
  const hasSkillsSection = /\bskills\b/i.test(normalizedResume) || detectedKeywords.length > 0;
  const actionVerbCount = ACTION_VERBS.reduce((count, verb) => {
    const matches = normalizedResume.match(new RegExp(`\\b${verb}\\b`, 'gi'));
    return count + (matches?.length || 0);
  }, 0);
  const quantifiedCount = (normalizedResume.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
  const clicheCount = CLICHE_PATTERNS.reduce((count, pattern) => count + (normalizedResume.match(pattern)?.length || 0), 0);
  const contact = detectContactSignals(normalizedResume);

  const formatIssues = [];
  let formatScore = 84;
  if (/\|/.test(normalizedResume) || /\t/.test(normalizedResume)) {
    formatIssues.push('Resume text suggests table or column-style formatting that some ATS systems may parse poorly.');
    formatScore -= 18;
  }
  if (normalizedResume.length < 300) {
    formatIssues.push('Resume appears very short, which can reduce ATS readability and recruiter confidence.');
    formatScore -= 12;
  }
  if (formatIssues.length === 0) {
    formatIssues.push('Keep section headings simple and avoid graphics, tables, or text boxes.');
  }

  const keywordIssues = [];
  let keywordScore = 72;
  if (targetKeywords.length > 0 && missingKeywords.length > 0) {
    keywordIssues.push(`Add missing job-specific keywords such as ${missingKeywords.slice(0, 5).join(', ')}.`);
    keywordScore -= Math.min(30, missingKeywords.length * 6);
  }
  if (detectedKeywords.length < 5) {
    keywordIssues.push('Add more role-relevant technical and domain keywords to improve ATS matching.');
    keywordScore -= 14;
  }
  if (keywordIssues.length === 0) {
    keywordIssues.push('Keyword coverage is reasonable, but it can be improved further with job-specific terminology.');
  }

  const lengthIssues = [];
  let lengthScore = 88;
  if (pageCount < 0.7 || resumeWords < 180) {
    lengthIssues.push('Resume is too short for a competitive ATS submission. Add more relevant detail and measurable impact.');
    lengthScore -= 28;
  } else if (pageCount > 2.2 || resumeWords > 1100) {
    lengthIssues.push('Resume is too long. Trim older or low-impact content to keep it within 1–2 pages.');
    lengthScore -= 22;
  } else {
    lengthIssues.push('Resume length is within the typical ATS-friendly range.');
  }

  const contentIssues = [];
  let contentScore = 78;
  if (actionVerbCount < 4) {
    contentIssues.push('Use stronger action verbs to start experience bullet points.');
    contentScore -= 18;
  }
  if (quantifiedCount < 2) {
    contentIssues.push('Add more quantified achievements with numbers, percentages, or measurable impact.');
    contentScore -= 18;
  }
  if (clicheCount > 0) {
    contentIssues.push('Replace vague phrases like "responsible for" with direct, achievement-oriented language.');
    contentScore -= 12;
  }
  if (contentIssues.length === 0) {
    contentIssues.push('Content quality is solid, but adding more measurable impact would strengthen the resume further.');
  }

  const overallScore = Math.round(
    (Math.max(0, formatScore) + Math.max(0, keywordScore) + contact.score + Math.max(0, lengthScore) + Math.max(0, contentScore)) / 5,
  );

  return normalizeAtsReport({
    overall_score: overallScore,
    score_band: scoreBandFromScore(overallScore),
    score_band_message: overallScore >= 80
      ? 'Your resume has a strong ATS foundation with a few improvements still available.'
      : 'Your resume can become much more ATS-friendly with focused improvements.',
    pass_probability: `${overallScore}%`,
    categories: {
      format: {
        score: formatScore,
        max: 20,
        passed_checks: formatIssues.length === 0 ? ['Resume structure appears reasonably clean for ATS parsing.'] : [],
        issues: formatIssues,
        fix: 'Use a simple single-column layout with standard section headings and plain bullet formatting.',
      },
      keywords: {
        score: keywordScore,
        max: 25,
        matched_keywords: detectedKeywords,
        missing_keywords: missingKeywords,
        passed_checks: detectedKeywords.length > 0 ? [`Detected relevant keywords such as ${detectedKeywords.slice(0, 4).join(', ')}.`] : [],
        issues: keywordIssues,
        fix: 'Add role-specific keywords from the target job description into experience, skills, and summary sections.',
      },
      contact_info: {
        score: contact.score,
        max: 15,
        detected: {
          name: !contact.issues.some((issue) => issue.includes('full name')),
          email: !contact.issues.some((issue) => issue.includes('email')),
          phone: !contact.issues.some((issue) => issue.includes('phone')),
          linkedin: !contact.issues.some((issue) => issue.includes('LinkedIn')),
          location: /[A-Za-z]/.test(normalizedResume),
        },
        passed_checks: contact.issues.length === 0 ? ['Core contact details are present and easy to scan.'] : [],
        issues: contact.issues.length > 0 ? contact.issues : ['Contact information coverage is solid.'],
        fix: 'Keep contact details in the body of the resume near the top and include LinkedIn plus location.',
      },
      length_structure: {
        score: lengthScore,
        max: 20,
        estimated_pages: Math.min(3, Math.max(1, Math.round(pageCount))),
        word_count: resumeWords,
        sections_found: ['Contact', hasSummarySection ? 'Summary' : '', hasExperienceSection ? 'Experience' : '', hasEducationSection ? 'Education' : '', hasSkillsSection ? 'Skills' : '']
          .filter(Boolean),
        sections_missing: [hasSummarySection ? '' : 'Summary', hasExperienceSection ? '' : 'Experience', hasEducationSection ? '' : 'Education', hasSkillsSection ? '' : 'Skills']
          .filter(Boolean),
        passed_checks: pageCount >= 0.7 && pageCount <= 2.2 ? ['Resume length is within a generally ATS-friendly range.'] : [],
        issues: lengthIssues,
        fix: 'Keep the resume between one and two pages with clear section order and visible date ranges.',
      },
      content_quality: {
        score: contentScore,
        max: 20,
        action_verbs_found: ACTION_VERBS.filter((verb) => new RegExp(`\\b${verb}\\b`, 'i').test(normalizedResume)).slice(0, 5),
        quantified_achievements: (normalizedResume.match(/[^\n]*\b\d+(?:\.\d+)?%?[^\n]*/g) || []).slice(0, 3),
        cliches_found: CLICHE_PATTERNS.flatMap((pattern) => normalizedResume.match(pattern) || []).slice(0, 5),
        passed_checks: quantifiedCount >= 2 ? ['Resume includes measurable results and concrete evidence of impact.'] : [],
        issues: contentIssues,
        fix: 'Start more bullets with strong action verbs and add measurable achievements using numbers or percentages.',
      },
    },
    top_3_priorities: [
      'Add more measurable achievements with numbers or percentages.',
      'Strengthen job-relevant keywords based on the target role.',
      'Keep formatting simple and ATS-friendly.',
    ],
    quick_wins: [
      'Add or update your LinkedIn URL near the top of the resume.',
    ],
    strengths: [
      detectedKeywords.length > 0
        ? `The resume already includes useful keywords such as ${detectedKeywords.slice(0, 3).join(', ')}.`
        : 'The resume has a usable structure that can be improved with stronger ATS wording.',
    ],
    improved_summary: 'ATS-focused professional with relevant experience and a stronger emphasis on measurable achievements, targeted keywords, and clear impact.',
    improved_bullet_points: [
      'Developed clearer, results-oriented bullet points that highlight responsibilities and business impact.',
      'Improved resume wording to emphasize action verbs, relevance, and ATS-friendly phrasing.',
    ],
  });
};

const extractJsonObject = (value) => {
  const text = cleanText(value);
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
};

const experienceTextLike = (value) => /\bexperience\b|\bemployment\b|\bwork history\b/i.test(value);
const educationLike = (value) => /\beducation\b|\bdegree\b|\buniversity\b|\bschool\b/i.test(value);

const normalizeAtsReport = (payload) => {
  const categories = payload?.categories || {};
  const lengthStructure = categories?.length_structure || categories?.length || {};
  const keywordCategory = categories?.keywords || {};
  const matchedKeywords = cleanList(
    keywordCategory?.matched_keywords || payload?.detected_keywords || payload?.matched_keywords,
  );
  const missingKeywords = cleanList(
    keywordCategory?.missing_keywords || payload?.missing_keywords,
  );
  const overallScore = clampScore(payload?.overall_score, 0);
  const defaultScoreMessage = overallScore >= 80
    ? 'Your resume is in a solid position, with a few targeted ATS improvements still possible.'
    : 'Your resume needs ATS-focused updates before it is ready for competitive applications.';

  const normalizedLengthStructure = {
    score: clampScore(lengthStructure?.score, 0),
    max: clampScore(lengthStructure?.max, 20) || 20,
    status: String(lengthStructure?.status || statusFromCategoryScore(clampScore(lengthStructure?.score, 0), clampScore(lengthStructure?.max, 20) || 20)),
    estimated_pages: Math.max(1, Math.min(3, Number.parseInt(String(lengthStructure?.estimated_pages ?? 1), 10) || 1)),
    word_count: Math.max(0, Number.parseInt(String(lengthStructure?.word_count ?? 0), 10) || 0),
    sections_found: cleanList(lengthStructure?.sections_found),
    sections_missing: cleanList(lengthStructure?.sections_missing),
    passed_checks: cleanList(lengthStructure?.passed_checks),
    issues: cleanList(lengthStructure?.issues),
    fix: normalizeWhitespace(lengthStructure?.fix),
  };

  const normalized = {
    overall_score: overallScore,
    score_band: scoreBandFromScore(overallScore),
    score_band_message: normalizeWhitespace(payload?.score_band_message) || defaultScoreMessage,
    pass_probability: typeof payload?.pass_probability === 'string' && payload.pass_probability.trim()
      ? payload.pass_probability.trim()
      : `${overallScore}%`,
    categories: {
      format: {
        score: clampScore(categories?.format?.score, 0),
        max: clampScore(categories?.format?.max, 20) || 20,
        status: String(categories?.format?.status || statusFromCategoryScore(clampScore(categories?.format?.score, 0), clampScore(categories?.format?.max, 20) || 20)),
        passed_checks: cleanList(categories?.format?.passed_checks),
        issues: cleanList(categories?.format?.issues),
        fix: normalizeWhitespace(categories?.format?.fix),
      },
      keywords: {
        score: clampScore(keywordCategory?.score, 0),
        max: clampScore(keywordCategory?.max, 25) || 25,
        status: String(keywordCategory?.status || statusFromCategoryScore(clampScore(keywordCategory?.score, 0), clampScore(keywordCategory?.max, 25) || 25)),
        matched_keywords: matchedKeywords,
        missing_keywords: missingKeywords,
        passed_checks: cleanList(keywordCategory?.passed_checks),
        issues: cleanList(keywordCategory?.issues),
        fix: normalizeWhitespace(keywordCategory?.fix),
      },
      contact_info: {
        score: clampScore(categories?.contact_info?.score, 0),
        max: clampScore(categories?.contact_info?.max, 15) || 15,
        status: String(categories?.contact_info?.status || statusFromCategoryScore(clampScore(categories?.contact_info?.score, 0), clampScore(categories?.contact_info?.max, 15) || 15)),
        detected: {
          name: normalizeBoolean(categories?.contact_info?.detected?.name),
          email: normalizeBoolean(categories?.contact_info?.detected?.email),
          phone: normalizeBoolean(categories?.contact_info?.detected?.phone),
          linkedin: normalizeBoolean(categories?.contact_info?.detected?.linkedin),
          location: normalizeBoolean(categories?.contact_info?.detected?.location),
        },
        passed_checks: cleanList(categories?.contact_info?.passed_checks),
        issues: cleanList(categories?.contact_info?.issues),
        fix: normalizeWhitespace(categories?.contact_info?.fix),
      },
      length_structure: normalizedLengthStructure,
      length: normalizedLengthStructure,
      content_quality: {
        score: clampScore(categories?.content_quality?.score, 0),
        max: clampScore(categories?.content_quality?.max, 20) || 20,
        status: String(categories?.content_quality?.status || statusFromCategoryScore(clampScore(categories?.content_quality?.score, 0), clampScore(categories?.content_quality?.max, 20) || 20)),
        action_verbs_found: cleanList(categories?.content_quality?.action_verbs_found),
        quantified_achievements: cleanList(categories?.content_quality?.quantified_achievements),
        cliches_found: cleanList(categories?.content_quality?.cliches_found),
        passed_checks: cleanList(categories?.content_quality?.passed_checks),
        issues: cleanList(categories?.content_quality?.issues),
        fix: normalizeWhitespace(categories?.content_quality?.fix),
      },
    },
    detected_keywords: matchedKeywords,
    missing_keywords: missingKeywords,
    top_3_priorities: cleanList(payload?.top_3_priorities || payload?.top_recommendations, []).slice(0, 3),
    top_recommendations: cleanList(payload?.top_3_priorities || payload?.top_recommendations, []).slice(0, 5),
    quick_wins: cleanList(payload?.quick_wins, []).slice(0, 3),
    strengths: cleanList(payload?.strengths, []).slice(0, 4),
    improved_summary: normalizeWhitespace(payload?.improved_summary),
    improved_bullet_points: cleanList(payload?.improved_bullet_points, []).slice(0, 4),
  };

  normalized.score_band = scoreBandFromScore(normalized.overall_score);
  return normalized;
};

const buildAtsPrompt = ({ resumeText, jobDescription }) => {
  const safeResume = truncateText(resumeText);
  const safeJobDescription = truncateText(jobDescription || '', 6000);

  return `
You are an expert ATS (Applicant Tracking System) evaluator with 10+ years of experience 
in HR tech and recruitment. Your job is to analyze resumes exactly like enterprise ATS 
software such as Workday, Greenhouse, Lever, and Taleo.

Analyze the resume below across 5 categories and return ONLY a valid JSON object. 
No explanation outside the JSON. No markdown. No code fences.

═══════════════════════════════
RESUME TEXT:
═══════════════════════════════
${safeResume}

═══════════════════════════════
JOB DESCRIPTION (if provided):
═══════════════════════════════
${safeJobDescription || "Not provided — perform general ATS evaluation"}

═══════════════════════════════
EVALUATION RULES:
═══════════════════════════════

1. FORMAT (max 20 points)
   - Deduct 5pts if resume likely uses tables or columns (detected by unusual spacing/alignment)
   - Deduct 5pts if special characters or symbols are used as bullet points (•✓★ etc.)
   - Deduct 3pts if fonts appear inconsistent (ALL CAPS sections excessive)
   - Deduct 3pts if resume has no clear section headers (Experience, Education, Skills)
   - Deduct 4pts if graphics/images/icons appear embedded (breaks ATS parsing)
   - Award full 20pts if clean single-column, standard font, clear headers detected

2. KEYWORDS (max 25 points)
   - If job description provided: extract top 15 keywords from JD, check each in resume
     Score = (matched / 15) * 25
   - If no JD provided: check for presence of industry-standard resume keywords:
     action verbs (managed, led, developed, implemented, achieved, designed, etc.),
     technical terms relevant to detected job field, soft skills (collaboration, leadership)
   - Deduct points for keyword stuffing (same keyword 4+ times unnaturally)

3. CONTACT INFO (max 15 points)
   - 5pts: Full name detected at top
   - 3pts: Email address present (format: x@x.x)
   - 3pts: Phone number present (any format with 10+ digits)
   - 2pts: LinkedIn URL or profile mentioned
   - 2pts: City/Location mentioned (full address not needed)
   - Deduct 5pts if contact info appears to be in a header/footer (ATS often can't read these)

4. LENGTH & STRUCTURE (max 20 points)
   - Count approximate word count from resume text
   - <300 words: 8pts (too short)
   - 300–600 words (1 page): 18pts (good for <5 yrs experience)  
   - 600–900 words (2 pages): 20pts (ideal for 5-15 yrs)
   - 900–1200 words: 15pts (borderline long)
   - >1200 words: 8pts (too long)
   - Deduct 5pts if no clear section order (Contact → Summary → Experience → Education → Skills)
   - Deduct 3pts if dates are missing from experience or education entries

5. CONTENT QUALITY (max 20 points)
   - 5pts: At least 60% of bullet points start with strong action verbs
   - 5pts: At least 2 quantified achievements found (numbers, %, $, x faster, etc.)
   - 4pts: No cliché phrases found ("team player", "hardworking", "go-getter", "passionate", 
     "results-driven", "detail-oriented", "synergy", "think outside the box")
   - 3pts: Professional summary/objective section present
   - 3pts: Skills section present with at least 5 skills listed
   - Deduct 2pts for each spelling error found (max -6pts)
   - Deduct 3pts if bullet points are full paragraphs (>3 lines each)

═══════════════════════════════
REQUIRED JSON OUTPUT FORMAT:
═══════════════════════════════

{
  "overall_score": <number 0-100>,
  "score_band": "<one of: Excellent | Good | Average | Poor>",
  "score_band_message": "<one encouraging sentence about their score>",
  "pass_probability": "<percentage like 87%>",
  "categories": {
    "format": {
      "score": <0-20>,
      "max": 20,
      "status": "<Excellent|Good|Needs Work|Poor>",
      "passed_checks": ["<what they did well>"],
      "issues": ["<specific issue found>"],
      "fix": "<one clear actionable fix sentence>"
    },
    "keywords": {
      "score": <0-25>,
      "max": 25,
      "status": "<Excellent|Good|Needs Work|Poor>",
      "matched_keywords": ["<keywords found in resume>"],
      "missing_keywords": ["<important keywords not found>"],
      "passed_checks": ["<what they did well>"],
      "issues": ["<specific issue found>"],
      "fix": "<one clear actionable fix sentence>"
    },
    "contact_info": {
      "score": <0-15>,
      "max": 15,
      "status": "<Excellent|Good|Needs Work|Poor>",
      "detected": {
        "name": <true|false>,
        "email": <true|false>,
        "phone": <true|false>,
        "linkedin": <true|false>,
        "location": <true|false>
      },
      "passed_checks": ["<what they did well>"],
      "issues": ["<specific issue found>"],
      "fix": "<one clear actionable fix sentence>"
    },
    "length_structure": {
      "score": <0-20>,
      "max": 20,
      "status": "<Excellent|Good|Needs Work|Poor>",
      "estimated_pages": <1|2|3>,
      "word_count": <number>,
      "sections_found": ["<section names detected>"],
      "sections_missing": ["<expected sections not found>"],
      "passed_checks": ["<what they did well>"],
      "issues": ["<specific issue found>"],
      "fix": "<one clear actionable fix sentence>"
    },
    "content_quality": {
      "score": <0-20>,
      "max": 20,
      "status": "<Excellent|Good|Needs Work|Poor>",
      "action_verbs_found": ["<up to 5 strong verbs detected>"],
      "quantified_achievements": ["<actual achievement examples from resume>"],
      "cliches_found": ["<cliché phrases detected>"],
      "passed_checks": ["<what they did well>"],
      "issues": ["<specific issue found>"],
      "fix": "<one clear actionable fix sentence>"
    }
  },
  "top_3_priorities": [
    "<most impactful fix they should do first>",
    "<second most impactful fix>",
    "<third most impactful fix>"
  ],
  "quick_wins": [
    "<something small they can fix in under 5 minutes>"
  ],
  "strengths": [
    "<genuine strength of this resume>"
  ]
}
`.trim();
};

const extractCompletionContent = (payload) => {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && typeof item.text === 'string') {
        return item.text;
      }
      return '';
    })
    .join('\n')
    .trim();
};

const callAtsModel = async ({ resumeText, jobDescription }) => {
  if (!ATS_AI_API_KEY) {
    return null;
  }

  const response = await fetch(ATS_AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ATS_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: ATS_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Return only valid JSON. Do not wrap JSON in markdown.',
        },
        {
          role: 'user',
          content: buildAtsPrompt({ resumeText, jobDescription }),
        },
      ],
      stream: false,
      temperature: ATS_AI_TEMPERATURE,
      max_tokens: ATS_AI_MAX_OUTPUT_TOKENS,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      `ATS model request failed with ${response.status}.`;
    throw new Error(message);
  }

  const content = extractCompletionContent(payload);
  return extractJsonObject(content);
};

const extractTextFromPdf = async (filePath) => {
  const pdfParseModule = await import('pdf-parse').catch(() => null);
  if (!pdfParseModule) {
    throw new Error('Missing dependency "pdf-parse". Run npm install in the server directory.');
  }

  const pdfParse = pdfParseModule.default || pdfParseModule;
  const buffer = await fs.readFile(filePath);
  const parsed = await pdfParse(buffer);
  return cleanText(parsed?.text || '');
};

const extractTextFromDocx = async (filePath) => {
  const mammothModule = await import('mammoth').catch(() => null);
  if (!mammothModule) {
    throw new Error('Missing dependency "mammoth". Run npm install in the server directory.');
  }

  const mammoth = mammothModule.default || mammothModule;
  const parsed = await mammoth.extractRawText({ path: filePath });
  return cleanText(parsed?.value || '');
};

export const extractResumeTextFromFile = async ({ filePath, originalName = '' }) => {
  const extension = path.extname(originalName || filePath).toLowerCase();

  if (extension === '.pdf') {
    return extractTextFromPdf(filePath);
  }

  if (extension === '.docx') {
    return extractTextFromDocx(filePath);
  }

  if (extension === '.txt') {
    return cleanText(await fs.readFile(filePath, 'utf8'));
  }

  if (extension === '.doc') {
    throw new Error('Legacy .doc parsing is not supported reliably. Please upload PDF or DOCX.');
  }

  throw new Error(`Unsupported resume format "${extension || 'unknown'}". Please upload PDF or DOCX.`);
};

export const analyzeResumeText = async ({ resumeText, jobDescription = '' }) => {
  const cleanedResumeText = cleanText(resumeText);
  if (!cleanedResumeText) {
    throw new Error('Resume text is empty.');
  }

  const aiReport = await callAtsModel({ resumeText: cleanedResumeText, jobDescription }).catch(() => null);
  if (aiReport) {
    return normalizeAtsReport(aiReport);
  }

  return buildHeuristicReport(cleanedResumeText, jobDescription);
};

export const analyzeResumeFile = async ({ filePath, originalName = '', jobDescription = '' }) => {
  const resumeText = await extractResumeTextFromFile({ filePath, originalName });
  return analyzeResumeText({ resumeText, jobDescription });
};
