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
    categories: {
      format: {
        score: formatScore,
        issues: formatIssues,
      },
      keywords: {
        score: keywordScore,
        issues: keywordIssues,
      },
      contact_info: {
        score: contact.score,
        issues: contact.issues.length > 0 ? contact.issues : ['Contact information coverage is solid.'],
      },
      length: {
        score: lengthScore,
        issues: lengthIssues,
      },
      content_quality: {
        score: contentScore,
        issues: contentIssues,
      },
    },
    detected_keywords: detectedKeywords,
    missing_keywords: missingKeywords,
    top_recommendations: [
      'Add more measurable achievements with numbers or percentages.',
      'Strengthen job-relevant keywords based on the target role.',
      'Keep formatting simple and ATS-friendly.',
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

const normalizeAtsReport = (payload) => {
  const categories = payload?.categories || {};
  const overallScore = clampScore(payload?.overall_score, 0);

  const normalized = {
    overall_score: overallScore,
    score_band: scoreBandFromScore(overallScore),
    categories: {
      format: {
        score: clampScore(categories?.format?.score, 0),
        issues: cleanList(categories?.format?.issues),
      },
      keywords: {
        score: clampScore(categories?.keywords?.score, 0),
        issues: cleanList(categories?.keywords?.issues),
      },
      contact_info: {
        score: clampScore(categories?.contact_info?.score, 0),
        issues: cleanList(categories?.contact_info?.issues),
      },
      length: {
        score: clampScore(categories?.length?.score, 0),
        issues: cleanList(categories?.length?.issues),
      },
      content_quality: {
        score: clampScore(categories?.content_quality?.score, 0),
        issues: cleanList(categories?.content_quality?.issues),
      },
    },
    detected_keywords: cleanList(payload?.detected_keywords),
    missing_keywords: cleanList(payload?.missing_keywords),
    top_recommendations: cleanList(payload?.top_recommendations, []).slice(0, 5),
    improved_summary: normalizeWhitespace(payload?.improved_summary),
    improved_bullet_points: cleanList(payload?.improved_bullet_points, []).slice(0, 4),
  };

  normalized.score_band = scoreBandFromScore(normalized.overall_score);
  return normalized;
};

const buildAtsPrompt = ({ resumeText, jobDescription }) => {
  const safeResume = truncateText(resumeText);
  const safeJobDescription = truncateText(jobDescription || 'Not provided', 6000);

  return [
    'You are a senior ATS resume checker.',
    'Use the following instructions exactly and return only valid JSON.',
    '',
    'MODEL:',
    ATS_AI_MODEL,
    '',
    'GOAL:',
    'Analyze the resume text and return an ATS compatibility report with strict, realistic scoring.',
    '',
    'EVALUATION AREAS:',
    '- Format',
    '- Keywords',
    '- Contact info',
    '- Length',
    '- Content quality',
    '',
    'SCORING RULES:',
    '- 90-100 => Excellent',
    '- 70-89 => Good',
    '- 50-69 => Average',
    '- Below 50 => Poor',
    '',
    'STRICT RULES:',
    '- Output MUST be valid JSON only',
    '- No markdown, no prose outside JSON',
    '- Be strict like a real ATS system',
    '- Prefer keyword-based and semantic evaluation',
    '- Penalize vague content, missing contact info, and weak formatting',
    '- If no job description is provided, evaluate keywords against the resume role context only',
    '',
    'JSON SHAPE:',
    '{',
    '  "overall_score": 0,',
    '  "score_band": "Excellent | Good | Average | Poor",',
    '  "categories": {',
    '    "format": { "score": 0, "issues": [] },',
    '    "keywords": { "score": 0, "issues": [] },',
    '    "contact_info": { "score": 0, "issues": [] },',
    '    "length": { "score": 0, "issues": [] },',
    '    "content_quality": { "score": 0, "issues": [] }',
    '  },',
    '  "detected_keywords": [],',
    '  "missing_keywords": [],',
    '  "top_recommendations": [],',
    '  "improved_summary": "",',
    '  "improved_bullet_points": []',
    '}',
    '',
    'RESUME TEXT:',
    safeResume || 'Not provided',
    '',
    'JOB DESCRIPTION:',
    safeJobDescription || 'Not provided',
  ].join('\n');
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
