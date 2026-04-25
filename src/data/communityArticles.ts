import atsResumeCover from '../assets/images/ats resume.jpeg';
import step1AtsFriendly from '../assets/images/Step-1- ATS-Friendly.jpg';
import step2ProperSections from '../assets/images/Step 2  Proper Sections & Information.jpg';
import step3AddKeywords from '../assets/images/Step 3 Add Keywords.jpg';
import step4ExportAsPdf from '../assets/images/Step 4 Export as PDF.jpg';

export type CommunityArticle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  authorName: string;
  coverImage: string;
  publishedAt: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  faqs: { question: string; answer: string }[];
};

const atsFriendlyResumeArticle: CommunityArticle = {
  id: 'static-ats-friendly-resume',
  slug: 'how-to-make-your-resume-ats-friendly-in-4-simple-steps',
  title: 'How To Make Your Resume ATS-Friendly In 4 Simple Steps',
  description:
    'Understanding the technology employers use to screen resumes stops many job seekers before they even start. The good news: optimizing for it takes less effort than you expect.',
  category: 'Resume Tips',
  authorName: 'Workshour Editorial',
  coverImage: atsResumeCover,
  publishedAt: '2026-04-24T00:00:00.000Z',
  metaTitle: 'How To Make Your Resume ATS-Friendly In 4 Simple Steps',
  metaDescription:
    'Understanding the technology employers use to screen resumes stops many job seekers before they even start. The good news: optimizing for it takes less effort than you expect.',
  content: `
    <p>Understanding the technology employers use to screen resumes stops many job seekers before they even start. The good news: optimizing for it takes less effort than you expect.</p>
    <p>Here is how to do it.</p>
    <h2>What Is The ATS?</h2>
    <p>Most job seekers believe ATS software uses AI to automatically reject resumes. That is largely a myth.</p>
    <p>In most cases, the ATS is a tool the hiring team uses to stay organized. A human is almost always the one reading your resume and making the final call.</p>
    <p>But if your resume ignores a few basic best practices, the ATS will struggle to read it properly. That creates problems before a human ever sees your application.</p>
    <h2>Step 1: Use An ATS-Friendly Resume Template</h2>
    <p>An ATS-friendly template lets software read and parse your resume content without errors. Skip the guesswork and use templates built specifically for this purpose.</p>
    <img src="${step1AtsFriendly}" alt="Step 1 illustration showing an ATS-friendly resume template" loading="lazy" decoding="async" />
    <p>ResyBuild.io offers templates designed to be ATS-friendly from the start.</p>
    <h2>Step 2: Clearly Label Sections And Include The Right Information</h2>
    <p>Follow these practices:</p>
    <img src="${step2ProperSections}" alt="Step 2 illustration showing proper resume sections and information" loading="lazy" decoding="async" />
    <ul>
      <li>Include your email, phone number, and full LinkedIn profile URL (example: linkedin.com/in/abelcak)</li>
      <li>Title your experience section "Experience" or "Work Experience"</li>
      <li>Use standard section titles: Summary, Objective, Education, Skills, Projects, Languages</li>
      <li>Format dates as MM/YYYY (example: 01/2025)</li>
    </ul>
    <p>These steps make it easier for the software to organize your resume data accurately inside the system.</p>
    <h2>Step 3: Add Keywords From The Target Job Description</h2>
    <p>Keywords do two things. They help your resume appear when employers filter candidates. They also show the person reading your resume the skills you bring.</p>
    <img src="${step3AddKeywords}" alt="Step 3 illustration showing resume keywords matched against a job description" loading="lazy" decoding="async" />
    <p>Here is a process that works:</p>
    <ol>
      <li>Copy your resume and the target job description</li>
      <li>Go to ResyMatch.io and paste both into the tool</li>
      <li>Run the scan and review the Hard and Soft Skills match sections</li>
      <li>Find the skills marked with red or yellow gaps</li>
      <li>Add those skills to your resume where they fit naturally</li>
      <li>Re-scan and repeat until you reach a score of 75</li>
    </ol>
    <h2>Step 4: Export Your Resume As A PDF</h2>
    <p>Any modern ATS reads Word documents and PDFs without issue. So why choose PDF?</p>
    <img src="${step4ExportAsPdf}" alt="Step 4 illustration showing a resume exported as a PDF" loading="lazy" decoding="async" />
    <p>Because a human will view your resume after it enters the system. PDFs keep your formatting consistent across every device, operating system, and browser. Your resume looks the same whether it is opened on a Mac, a Windows PC, or printed on paper.</p>
    <p>Follow these four steps and your resume will be in solid shape for any ATS.</p>
  `.trim(),
  faqs: [],
};

export const STATIC_COMMUNITY_ARTICLES: CommunityArticle[] = [atsFriendlyResumeArticle];

export const getStaticCommunityCategories = () =>
  Array.from(new Set(STATIC_COMMUNITY_ARTICLES.map((article) => article.category))).sort((a, b) => a.localeCompare(b));

export const filterStaticCommunityArticles = (query: string, category: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  return STATIC_COMMUNITY_ARTICLES.filter((article) => {
    const matchesQuery = !normalizedQuery || article.title.toLowerCase().includes(normalizedQuery);
    const matchesCategory = category === 'All' || article.category === category;
    return matchesQuery && matchesCategory;
  });
};

export const findStaticCommunityArticle = (slug?: string) =>
  STATIC_COMMUNITY_ARTICLES.find((article) => article.slug === slug);
