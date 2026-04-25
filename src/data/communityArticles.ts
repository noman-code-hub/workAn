import atsResumeCover from '../assets/images/ats resume.jpeg';
import step1AtsFriendly from '../assets/images/Step-1- ATS-Friendly.jpg';
import step2ProperSections from '../assets/images/Step 2  Proper Sections & Information.jpg';
import step3AddKeywords from '../assets/images/Step 3 Add Keywords.jpg';
import step4ExportAsPdf from '../assets/images/Step 4 Export as PDF.jpg';
import step1StrongResumeSummary from '../assets/images/Step 1 Strong Resume Summary.jpg';
import step2EducationSectionFirst from '../assets/images/Step 2 Education Section First.jpg';
import step3InternshipsPartTime from '../assets/images/Step 3 Internships & Part-Time Experience.jpg';
import step4ProjectsSection from '../assets/images/Step 4 Projects Section.jpg';
import step5SkillsSection from '../assets/images/Step 5 Skills Section (Smart Listing).jpg';
import step6VolunteerActivities from '../assets/images/Step 6 Volunteer & Extracurricular Activities.jpg';
import step8ProperResumeFormatting from '../assets/images/Step 8 Proper Resume Formatting.jpg';
import resumeFormatCover from '../assets/images/How To Choose The Best Resume Format In 2026 (Chronological vs Functional vs Combination).jpg';
import chronologicalResumeImage from '../assets/images/2. Chronological Resume (Most Important Format).jpg';
import functionalResumeImage from '../assets/images/3. Functional Resume (With Warning Feel).jpg';
import combinationResumeImage from '../assets/images/4. Combination Resume (Best Balanced Option).jpg';
import chooseResumeFormatImage from '../assets/images/5. How To Choose (Decision Guide).jpg';
import resumeSummaryCover from '../assets/images/How To Write a Resume Summary That Gets You Noticed In 6 Seconds/How To Write a Resume Summary That Gets You Noticed In 6 Seconds.jpg';
import whatIsResumeSummaryImage from '../assets/images/How To Write a Resume Summary That Gets You Noticed In 6 Seconds/2. What Is a Resume Summary.jpg';
import resumeSummaryElementsImage from '../assets/images/How To Write a Resume Summary That Gets You Noticed In 6 Seconds/3. 4 Key Elements (Structure Visual).jpg';
import strongVsWeakSummaryImage from '../assets/images/How To Write a Resume Summary That Gets You Noticed In 6 Seconds/4. Strong vs Weak Summary.jpg';
import optimizedSummaryImage from '../assets/images/How To Write a Resume Summary That Gets You Noticed In 6 Seconds/5. Final Optimized Summary (Result).jpg';

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

const noExperienceResumeArticle: CommunityArticle = {
  id: 'static-no-experience-resume',
  slug: 'how-to-write-a-resume-with-no-experience-for-fresh-graduates-and-career-starters',
  title: 'How To Write a Resume With No Experience (For Fresh Graduates And Career Starters)',
  description:
    'You do not need years of experience to write a strong resume. You need the right structure, the right content, and a clear picture of the value you bring.',
  category: 'Resume Tips',
  authorName: 'Workshour Editorial',
  coverImage: step1StrongResumeSummary,
  publishedAt: '2026-04-25T00:00:00.000Z',
  metaTitle: 'How To Write a Resume With No Experience (For Fresh Graduates And Career Starters)',
  metaDescription:
    'Fresh graduates and career starters can build a strong resume by focusing on summary, education, projects, skills, and relevant experience.',
  content: `
    <p>You just graduated. Or you are making your first move into the workforce. You open a blank document and stare at it.</p>
    <p>The problem feels obvious: you have no work experience. So what do you put on a resume?</p>
    <p>More than you think. Here is exactly how to do it.</p>
    <h2>First, Understand What Employers Are Actually Looking For</h2>
    <p>Hiring managers reviewing entry-level resumes know you have little to no work history. They are not expecting 10 years of experience. They are looking for three things:</p>
    <ul>
      <li>Your potential to learn and grow</li>
      <li>Signs that you take initiative</li>
      <li>Proof that you have relevant skills</li>
    </ul>
    <p>Your job is to show all three using what you already have.</p>
    <h2>Step 1: Start With a Strong Resume Summary</h2>
    <p>Your summary sits at the top of your resume. It is 2 to 3 sentences. It tells the employer who you are and what you bring to the table.</p>
    <p>Do not write a generic objective like "seeking a position where I grow professionally." That tells the employer nothing.</p>
    <p>Write a summary that is specific. Include your field of study, a relevant skill, and what you want to do.</p>
    <img src="${step1StrongResumeSummary}" alt="Step 1 illustration showing how to write a strong resume summary" loading="lazy" decoding="async" />
    <p><strong>Example:</strong></p>
    <p>"Recent marketing graduate with hands-on experience running social media campaigns for two student organizations. Skilled in content creation, data analysis, and email marketing. Looking to bring measurable results to a growth-focused team."</p>
    <p>That summary works because it is specific, skill-focused, and direct.</p>
    <h2>Step 2: Lead With Education</h2>
    <p>When you have no work experience, your education section moves to the top of your resume, right after your summary.</p>
    <p>Include:</p>
    <img src="${step2EducationSectionFirst}" alt="Step 2 illustration showing the education section placed near the top of a resume" loading="lazy" decoding="async" />
    <ul>
      <li>Your degree and field of study</li>
      <li>Your university name and location</li>
      <li>Your graduation date in MM/YYYY format (example: 05/2024)</li>
      <li>Your GPA if it is 3.5 or above</li>
      <li>Relevant coursework, list 4 to 6 courses tied to the job you want</li>
      <li>Academic honors or awards</li>
    </ul>
    <p><strong>Example:</strong></p>
    <p>Bachelor of Science in Computer Science<br />University of Texas, Austin, TX<br />Graduated: 05/2024<br />GPA: 3.7<br />Relevant Coursework: Data Structures, Machine Learning, Web Development, Database Systems</p>
    <p>Relevant coursework is underused. It shows employers the specific skills you studied, even without a job title to back them up.</p>
    <h2>Step 3: Use Internships, Freelance Work, And Part-Time Jobs</h2>
    <p>You likely have more experience than you realize. Think beyond full-time jobs.</p>
    <p>Include any of these if they are relevant:</p>
    <img src="${step3InternshipsPartTime}" alt="Step 3 illustration showing internships, freelance work, and part-time experience on a resume" loading="lazy" decoding="async" />
    <ul>
      <li>Internships (paid or unpaid)</li>
      <li>Freelance projects</li>
      <li>Part-time or seasonal jobs</li>
      <li>Family business work</li>
    </ul>
    <p>For each role, write 2 to 3 bullet points. Start each bullet with an action verb. Focus on what you did and the result it produced.</p>
    <p><strong>Example (Part-Time Retail Job):</strong></p>
    <ul>
      <li>Assisted 50+ customers daily in finding products, increasing upsell conversion by 15%</li>
      <li>Managed end-of-day cash registers and reconciled totals with zero discrepancies over 6 months</li>
      <li>Trained 3 new team members on store procedures during peak season</li>
    </ul>
    <p>Even a retail job shows communication, responsibility, and reliability. Those qualities transfer to any role.</p>
    <h2>Step 4: Add a Projects Section</h2>
    <p>Projects are one of the most effective tools for entry-level job seekers. They show real work, not just potential.</p>
    <p>Include academic projects, personal projects, or freelance work. Treat each project like a job.</p>
    <img src="${step4ProjectsSection}" alt="Step 4 illustration showing how to add a projects section to a resume" loading="lazy" decoding="async" />
    <p>Format:</p>
    <ul>
      <li>Project Name</li>
      <li>Brief description, 1 sentence</li>
      <li>Tools or skills used</li>
      <li>Result or outcome</li>
    </ul>
    <p><strong>Example:</strong></p>
    <p>Personal Finance Tracker App<br />Built a web app that tracks monthly income and expenses using Python and Flask. Deployed on Heroku with 200+ active users within 30 days of launch.</p>
    <p>That one project tells an employer you write code, ship products, and build things people use. No job title required.</p>
    <h2>Step 5: List Your Skills Strategically</h2>
    <p>Do not dump every skill you have ever heard of into this section. Be selective and honest.</p>
    <p>Split your skills into two categories:</p>
    <img src="${step5SkillsSection}" alt="Step 5 illustration showing a smart way to list skills on a resume" loading="lazy" decoding="async" />
    <p><strong>Hard Skills:</strong> specific, teachable abilities tied to the job. Examples: Python, Google Analytics, Adobe Photoshop, SQL, Excel.</p>
    <p><strong>Soft Skills:</strong> Do not list these as plain words like "communication" or "teamwork." Anyone writes those. Instead, weave soft skills into your bullet points.</p>
    <p><strong>Wrong:</strong> Skills: Communication, Teamwork, Leadership</p>
    <p><strong>Right:</strong> "Led a team of 5 students to deliver a market research project 2 weeks ahead of schedule."</p>
    <p>That bullet shows leadership. You do not need to say the word.</p>
    <h2>Step 6: Include Volunteer Work And Extracurricular Activities</h2>
    <p>No experience does not mean no activity. Think about what you have done outside of class.</p>
    <p>Include:</p>
    <img src="${step6VolunteerActivities}" alt="Step 6 illustration showing volunteer work and extracurricular activities on a resume" loading="lazy" decoding="async" />
    <ul>
      <li>Volunteer roles</li>
      <li>Student clubs or organizations</li>
      <li>Sports teams, especially leadership roles</li>
      <li>Community service</li>
    </ul>
    <p>Format these the same way you format work experience. Give them a title, an organization name, dates, and bullet points with results.</p>
    <p><strong>Example:</strong></p>
    <p>Social Media Manager, Marketing Club, University of Texas<br />08/2022 to 05/2024</p>
    <ul>
      <li>Grew the club's Instagram following from 300 to 2,400 in 18 months</li>
      <li>Designed weekly content calendars and scheduled posts using Hootsuite</li>
      <li>Coordinated 4 sponsored events with local businesses, generating $3,000 in funding</li>
    </ul>
    <p>That is real experience. It belongs on your resume.</p>
    <h2>Step 7: Add Certifications And Online Courses</h2>
    <p>Certifications show initiative. They tell employers you did not wait for a classroom to teach you relevant skills.</p>
    <p>Strong certifications for entry-level candidates include:</p>
    <ul>
      <li>Google Analytics Certification (free)</li>
      <li>HubSpot Content Marketing Certification (free)</li>
      <li>Meta Social Media Marketing Certificate</li>
      <li>AWS Cloud Practitioner (for tech roles)</li>
      <li>Coursera or LinkedIn Learning certificates in your field</li>
    </ul>
    <p>List the certification name, the issuing organization, and the date you earned it.</p>
    <h2>Step 8: Format Your Resume The Right Way</h2>
    <p>None of the content above matters if your resume is hard to read or fails to parse through an ATS.</p>
    <img src="${step8ProperResumeFormatting}" alt="Step 8 illustration showing proper resume formatting for ATS readability" loading="lazy" decoding="async" />
    <p>Follow these rules:</p>
    <ul>
      <li>Use a clean, single-column template with clear section headers</li>
      <li>Set your font to Arial, Calibri, or Garamond at 10 to 12pt</li>
      <li>Keep margins at 1 inch on all sides</li>
      <li>Stick to one page</li>
      <li>Save and send as a PDF</li>
      <li>Use MM/YYYY date format throughout</li>
      <li>Label sections clearly: Summary, Education, Skills, Projects, Experience, Certifications</li>
    </ul>
    <p>Avoid tables, graphics, and text boxes. ATS software struggles to read them.</p>
    <h2>What Your Resume Structure Should Look Like</h2>
    <p>Here is the order that works best when you have little to no experience:</p>
    <ol>
      <li>Contact Information</li>
      <li>Resume Summary</li>
      <li>Education</li>
      <li>Skills</li>
      <li>Projects</li>
      <li>Experience (internships, part-time, freelance)</li>
      <li>Volunteer Work and Extracurriculars</li>
      <li>Certifications</li>
    </ol>
    <h2>One Final Thing: Tailor Every Resume You Send</h2>
    <p>A generic resume sent to 50 employers produces poor results. A tailored resume sent to 10 employers produces interviews.</p>
    <p>For every job you apply to:</p>
    <ul>
      <li>Read the job description carefully</li>
      <li>Identify the top 5 to 8 skills and keywords they list</li>
      <li>Make sure those exact words appear in your resume where they fit naturally</li>
      <li>Adjust your summary to reflect the specific role</li>
    </ul>
    <p>This takes 15 minutes per application. It is the single highest-return action in your job search.</p>
    <p>You do not need years of experience to write a strong resume. You need the right structure, the right content, and a clear picture of the value you bring. Follow these steps and your resume will stand out from every other entry-level candidate who sent a blank-looking page.</p>
  `.trim(),
  faqs: [],
};

const bestResumeFormatArticle: CommunityArticle = {
  id: 'static-best-resume-format-2026',
  slug: 'how-to-choose-the-best-resume-format-in-2026-chronological-vs-functional-vs-combination',
  title: 'How To Choose The Best Resume Format In 2026 (Chronological vs Functional vs Combination)',
  description:
    'Choosing the right resume format affects how recruiters read your resume and whether ATS software parses it correctly.',
  category: 'Resume Tips',
  authorName: 'Workshour Editorial',
  coverImage: resumeFormatCover,
  publishedAt: '2026-04-25T00:00:00.000Z',
  metaTitle: 'How To Choose The Best Resume Format In 2026 (Chronological vs Functional vs Combination)',
  metaDescription:
    'Learn when to use a chronological, functional, or combination resume format in 2026 and which option is best for your situation.',
  content: `
    <p>Most job seekers spend hours writing resume content and five minutes on format. <strong>That is the wrong order of priorities.</strong></p>
    <p>The format you choose controls how a hiring manager reads your resume. It also controls whether an ATS parses it correctly. <strong>Get it wrong and your content does not matter.</strong></p>
    <p>Here is what you need to know.</p>

    <h2>What Is a Resume Format?</h2>
    <p>A resume format is the structure you use to organize your information. It determines what comes first, what gets emphasized, and how a recruiter moves through your resume.</p>
    <p>There are <strong>three formats used in 2026</strong>:</p>
    <ul>
      <li><strong>Chronological</strong></li>
      <li><strong>Functional</strong></li>
      <li><strong>Combination</strong></li>
    </ul>
    <p>Each one serves a different type of job seeker. <strong>Picking the wrong one works against you.</strong></p>

    <h2>Format 1: Chronological Resume</h2>
    <p>The chronological format lists your work experience from most recent to oldest. It is the most widely used format in the world.</p>
    <img src="${chronologicalResumeImage}" alt="Chronological resume format example showing experience listed from most recent to oldest" loading="lazy" decoding="async" />

    <h3>Your Structure Looks Like This</h3>
    <ul>
      <li>Contact Information</li>
      <li>Resume Summary</li>
      <li>Work Experience (most recent first)</li>
      <li>Education</li>
      <li>Skills</li>
      <li>Certifications</li>
    </ul>

    <h3>Who It Works For</h3>
    <ul>
      <li>Job seekers with a consistent work history in one field</li>
      <li>Professionals with 2 or more years of experience</li>
      <li>Anyone applying to roles in traditional industries like finance, law, healthcare, or engineering</li>
    </ul>

    <h3>Why Recruiters Prefer It</h3>
    <p>Hiring managers read hundreds of resumes. The chronological format is familiar. They know exactly where to look for your last job, your title, and how long you stayed. It takes them seconds to evaluate your background.</p>
    <p><strong>According to a 2024 Jobscan study, over 90% of recruiters prefer the chronological format over any other.</strong></p>

    <h3>When To Avoid It</h3>
    <ul>
      <li>You have gaps in your employment history</li>
      <li>You are switching industries</li>
      <li>You are a fresh graduate with no work experience</li>
    </ul>
    <p>If any of those apply to you, read the next two formats carefully.</p>

    <h2>Format 2: Functional Resume</h2>
    <p>The functional format leads with your skills, not your job titles. Work experience moves to the bottom and gets minimal detail.</p>
    <img src="${functionalResumeImage}" alt="Functional resume format example with a warning about recruiter and ATS drawbacks" loading="lazy" decoding="async" />

    <h3>Your Structure Looks Like This</h3>
    <ul>
      <li>Contact Information</li>
      <li>Resume Summary</li>
      <li>Skills Summary (grouped by category)</li>
      <li>Work Experience (brief, titles and dates only)</li>
      <li>Education</li>
      <li>Certifications</li>
    </ul>

    <h3>Who It Works For</h3>
    <ul>
      <li>Career changers moving into a new field</li>
      <li>Job seekers with significant employment gaps</li>
      <li>People re-entering the workforce after time away</li>
    </ul>

    <h3>Why Some Job Seekers Choose It</h3>
    <p>It puts your abilities front and center. If your work history does not reflect the skills you bring to a new role, this format lets you lead with what you know instead of where you worked.</p>

    <h3>The Problem With the Functional Format</h3>
    <p><strong>Recruiters dislike it.</strong> A 2023 survey by Ladders found that hiring managers spend an average of <strong>7 seconds</strong> on an initial resume scan. They look for job titles and company names first. The functional format buries both.</p>
    <p><strong>ATS software also struggles with functional resumes.</strong> Skills grouped into categories without clear job context often fail to parse correctly.</p>
    <p><strong>Use the functional format only as a last resort.</strong> The combination format solves most of the same problems without the drawbacks.</p>

    <h2>Format 3: Combination Resume</h2>
    <p>The combination format merges the chronological and functional approaches. It leads with a skills summary, then follows with a full chronological work history.</p>
    <img src="${combinationResumeImage}" alt="Combination resume format example showing skills at the top followed by chronological work history" loading="lazy" decoding="async" />

    <h3>Your Structure Looks Like This</h3>
    <ul>
      <li>Contact Information</li>
      <li>Resume Summary</li>
      <li>Skills Section</li>
      <li>Work Experience (most recent first, with full bullet points)</li>
      <li>Education</li>
      <li>Certifications</li>
    </ul>

    <h3>Who It Works For</h3>
    <ul>
      <li>Career changers who still have relevant work history</li>
      <li>Professionals with employment gaps but strong skills</li>
      <li>Senior candidates with diverse experience across multiple fields</li>
      <li>Fresh graduates with strong project or internship experience</li>
    </ul>

    <h3>Why It Works</h3>
    <p>You get the best of both formats. Your skills appear at the top where recruiters see them first. Your work history follows in a format ATS software reads correctly. <strong>Nothing gets buried.</strong></p>
    <p>This format takes more effort to write well. Every skill you list at the top needs evidence in your work history below. If you list <strong>"project management"</strong> as a skill, your bullet points need to back it up with numbers and results.</p>

    <h2>How To Pick The Right Format For Your Situation</h2>
    <p>Use this as your guide:</p>
    <img src="${chooseResumeFormatImage}" alt="Decision guide showing how to choose the best resume format based on your situation" loading="lazy" decoding="async" />
    <ul>
      <li><strong>You have 2 or more years of steady experience in one field:</strong> use chronological.</li>
      <li><strong>You are a fresh graduate with internships or projects:</strong> use combination.</li>
      <li><strong>You are switching careers and have transferable skills:</strong> use combination.</li>
      <li><strong>You have employment gaps of 6 months or more:</strong> use combination, and address the gap briefly in your summary.</li>
      <li><strong>You are returning to work after a long break:</strong> use combination.</li>
      <li><strong>You have no experience and no projects:</strong> use chronological, and focus your resume on education, coursework, volunteer work, and certifications.</li>
    </ul>
    <p><strong>Avoid the functional format in almost every case.</strong> The combination format does everything the functional format does, without the ATS and recruiter problems.</p>

    <h2>Format Rules That Apply To All Three</h2>
    <p>Regardless of the format you choose, these rules apply:</p>
    <ul>
      <li>Use a clean, single-column layout</li>
      <li>Set your font to Arial, Calibri, or Garamond at 10 to 12pt</li>
      <li>Keep margins at 1 inch on all sides</li>
      <li>Use MM/YYYY date format throughout (example: 03/2024)</li>
      <li>Label every section clearly</li>
      <li>Save your resume as a PDF</li>
      <li>Keep it to one page if you have under 10 years of experience</li>
      <li>Two pages are acceptable for senior professionals with extensive history</li>
    </ul>
    <p><strong>Do not use tables, text boxes, or graphics.</strong> ATS software reads left to right, top to bottom. Anything outside a standard text block risks getting lost or misread.</p>

    <h2>The One Mistake Most Job Seekers Make</h2>
    <p>They pick a format and never change it. They send the same resume structure to every job, every industry, every seniority level.</p>
    <p>Your format is not permanent. A fresh graduate applying to a startup uses a different structure than a senior manager applying to a Fortune 500 company.</p>
    <p>Revisit your format every time you apply to a new type of role. Ask yourself: <strong>does this structure show the most relevant information in the first 7 seconds a recruiter spends on my resume?</strong></p>
    <p>If the answer is no, switch formats.</p>

    <h2>Final Takeaway</h2>
    <p>The right format does not get you the job. <strong>It gets your resume read.</strong> Once a human being reads your content, your experience and skills take over. Your format just needs to get you to that point.</p>
    <p><strong>Choose based on your situation, not based on what looks impressive.</strong> The format a recruiter expects is always the right one.</p>
  `.trim(),
  faqs: [],
};

const resumeSummaryArticle: CommunityArticle = {
  id: 'static-resume-summary-6-seconds',
  slug: 'how-to-write-a-resume-summary-that-gets-you-noticed-in-6-seconds',
  title: 'How To Write a Resume Summary That Gets You Noticed In 6 Seconds',
  description:
    'A strong resume summary helps recruiters understand your title, experience, skills, and results in just a few seconds.',
  category: 'Resume Tips',
  authorName: 'Workshour Editorial',
  coverImage: resumeSummaryCover,
  publishedAt: '2026-04-25T00:00:00.000Z',
  metaTitle: 'How To Write a Resume Summary That Gets You Noticed In 6 Seconds',
  metaDescription:
    'Learn how to write a resume summary that grabs attention fast with the right structure, examples, and job-specific keywords.',
  content: `
    <p>A 2018 eye-tracking study by Ladders found that recruiters spend an average of <strong>7.4 seconds</strong> on an initial resume scan. Most of that time goes to the top third of the page.</p>
    <p>Your resume summary sits right there. It is the first thing a recruiter reads. It is also the <strong>most skipped, most generic, and most wasted</strong> section on the average resume.</p>
    <p>Here is how to write one that actually works.</p>

    <h2>What Is a Resume Summary?</h2>
    <p>A resume summary is <strong>2 to 4 sentences</strong> at the top of your resume. It tells the recruiter who you are, what you do, and what you bring to the role.</p>
    <p>It is <strong>not</strong> an objective statement. Objective statements focus on what you want from the employer. A summary focuses on what you offer the employer. Those are two very different things.</p>
    <img src="${whatIsResumeSummaryImage}" alt="Illustration explaining what a resume summary is and where it appears on a resume" loading="lazy" decoding="async" />

    <h3>Wrong Approach</h3>
    <p>"Seeking a challenging position in marketing where I grow professionally and contribute to a team."</p>
    <p>That sentence tells the recruiter <strong>nothing useful</strong>. Every candidate wants to grow. Every candidate wants to contribute.</p>

    <h3>Right Approach</h3>
    <p>"Digital marketing specialist with 4 years of experience managing paid search campaigns for B2B SaaS companies. Generated $2.3M in pipeline revenue in 2023 through Google Ads and LinkedIn campaigns. Experienced in HubSpot, Salesforce, and Google Analytics."</p>
    <p>That summary works. Here is why.</p>

    <h2>The 4 Elements of a Strong Resume Summary</h2>
    <p>Every effective resume summary contains <strong>four things</strong>:</p>
    <img src="${resumeSummaryElementsImage}" alt="Visual breakdown of the four key elements of a strong resume summary" loading="lazy" decoding="async" />

    <h3>1. Your Professional Identity</h3>
    <p>This is your job title or field. It tells the recruiter immediately who you are. Use the title that matches the job you are applying for, not your current internal title if the two differ.</p>
    <p><strong>Examples:</strong></p>
    <ul>
      <li>"Software engineer with 5 years of experience"</li>
      <li>"Certified project manager with a background in construction"</li>
      <li>"Recent finance graduate with internship experience at JPMorgan"</li>
    </ul>

    <h3>2. Your Years of Experience</h3>
    <p>Be specific. <strong>"Several years"</strong> means nothing. <strong>"6 years"</strong> means something.</p>
    <p>If you are a fresh graduate, replace years of experience with your degree and field of study. "Recent computer science graduate from NYU" gives the recruiter the same context.</p>

    <h3>3. Your Top Skills or Specializations</h3>
    <p>Name <strong>2 to 3 skills</strong> directly relevant to the role. Pull these from the job description. If the employer lists "data analysis" and "Python" as requirements, those words belong in your summary.</p>
    <p>This is not about stuffing keywords. It is about showing the recruiter and the ATS that you match what they are looking for.</p>

    <h3>4. A Measurable Result or Achievement</h3>
    <p>This is the element most job seekers leave out. <strong>Numbers make your summary credible.</strong> They separate you from every other candidate who used the same generic phrases.</p>
    <p>If you increased sales, name the percentage. If you managed a budget, name the amount. If you led a team, name the size.</p>
    <p>No number is too small if it is real and relevant.</p>

    <h2>How To Write Your Resume Summary: Step By Step</h2>
    <h3>Step 1: Write down your job title and years of experience in one sentence.</h3>
    <p>"Operations manager with 7 years of experience in logistics and supply chain."</p>

    <h3>Step 2: Add your top 2 to 3 skills relevant to the target role.</h3>
    <p>"Skilled in inventory management, vendor negotiation, and ERP systems including SAP and Oracle."</p>

    <h3>Step 3: Add one measurable achievement.</h3>
    <p>"Reduced warehouse operating costs by 22% over 18 months by restructuring vendor contracts and automating order tracking."</p>

    <h3>Step 4: Combine into 2 to 3 sentences and cut any word that does not add information.</h3>
    <img src="${optimizedSummaryImage}" alt="Final optimized resume summary example showing the finished result" loading="lazy" decoding="async" />
    <p><strong>Final result:</strong></p>
    <p>"Operations manager with 7 years of experience in logistics and supply chain. Skilled in inventory management, vendor negotiation, and SAP. Reduced warehouse operating costs by 22% over 18 months by restructuring vendor contracts and automating order tracking."</p>
    <p>That summary takes a recruiter <strong>6 seconds</strong> to read. In those 6 seconds, they know your title, your experience level, your skills, and your results. That is everything they need to keep reading.</p>

    <h2>Strong vs Weak Resume Summary</h2>
    <p>The difference between a strong summary and a weak one is simple: <strong>specifics beat vague claims.</strong></p>
    <img src="${strongVsWeakSummaryImage}" alt="Comparison of a strong resume summary versus a weak generic summary" loading="lazy" decoding="async" />
    <p><strong>Weak summaries</strong> use phrases like "hard-working," "motivated," or "seeking an opportunity" without giving proof.</p>
    <p><strong>Strong summaries</strong> include a clear title, relevant skills, and a measurable result.</p>

    <h2>Resume Summary Examples By Situation</h2>
    <h3>Fresh Graduate With No Experience</h3>
    <p>"Recent business administration graduate from the University of Michigan with a 3.8 GPA. Completed a 3-month marketing internship at a mid-size e-commerce brand, managing email campaigns to a list of 15,000 subscribers. Proficient in Mailchimp, Google Analytics, and Excel."</p>

    <h3>Career Changer</h3>
    <p>"Former high school teacher with 8 years of experience in curriculum development and public speaking, transitioning into corporate training and L&amp;D. Designed and delivered 200+ hours of educational content to groups of up to 40 people. Completed a Coursera certification in Instructional Design in 01/2024."</p>

    <h3>Senior Professional</h3>
    <p>"VP of Sales with 14 years of experience leading B2B revenue teams in the SaaS industry. Built and managed a 35-person sales organization that grew annual recurring revenue from $4M to $28M over 5 years. Expert in Salesforce, consultative selling, and enterprise contract negotiation."</p>

    <h3>Mid-Level Professional With an Employment Gap</h3>
    <p>"Financial analyst with 6 years of experience in FP&amp;A and budget forecasting, returning to the workforce after a 14-month career break. Previously supported a $120M annual budget at a Fortune 500 retail company. Proficient in Excel, Tableau, and SAP."</p>

    <h3>Entry-Level With Strong Projects</h3>
    <p>"Computer science graduate from Georgia Tech with hands-on experience building full-stack web applications using React and Node.js. Developed a personal budgeting app with 500+ active users on the Google Play Store. Seeking a junior developer role at a product-focused company."</p>

    <h2>Five Things To Remove From Your Resume Summary</h2>
    <p>These phrases appear on thousands of resumes. They add no information and waste your 6 seconds.</p>
    <ul>
      <li><strong>"Hard-working professional."</strong> Every candidate says this. Show it with a result instead.</li>
      <li><strong>"Team player."</strong> This tells a recruiter nothing specific about your contribution.</li>
      <li><strong>"Passionate about."</strong> Passion does not appear on a resume. Results do.</li>
      <li><strong>"Detail-oriented."</strong> If you were detail-oriented, you would know this phrase is overused.</li>
      <li><strong>"Seeking a challenging opportunity."</strong> The recruiter does not care what you seek. They care what you deliver.</li>
    </ul>
    <p><strong>Replace every one of those phrases</strong> with a specific skill, a number, or a title.</p>

    <h2>How To Tailor Your Summary For Each Job</h2>
    <p>One summary does not work for every application. A recruiter hiring a data analyst and a recruiter hiring a marketing manager look for different things. Your summary needs to reflect that.</p>
    <p>For every job you apply to:</p>
    <ul>
      <li>Read the job description from top to bottom</li>
      <li>Identify the 3 most important skills or qualifications they list</li>
      <li>Make sure those exact terms appear in your summary</li>
      <li>Adjust your achievement to the one most relevant to that role</li>
    </ul>
    <p>This takes <strong>10 minutes per application</strong>. It is the difference between a resume that gets a callback and one that gets deleted.</p>

    <h2>How Long Should Your Resume Summary Be?</h2>
    <p><strong>Two to four sentences. Never more.</strong></p>
    <p>Recruiters do not read long paragraphs at the top of a resume. They scan. If your summary runs past four sentences, cut it. Every sentence needs to earn its place.</p>
    <p><strong>One sentence per element works well:</strong></p>
    <ul>
      <li>Sentence 1: Who you are and your experience level</li>
      <li>Sentence 2: Your top skills</li>
      <li>Sentence 3: Your strongest result</li>
    </ul>
    <p><strong>Three sentences. Six seconds. One shot</strong> to make the recruiter keep reading.</p>

    <h2>Final Tip</h2>
    <p>Write your summary <strong>last</strong>. After you finish the rest of your resume, you will know exactly which skills and achievements are strongest. Pull the best ones to the top. That is your summary.</p>
  `.trim(),
  faqs: [],
};

export const STATIC_COMMUNITY_ARTICLES: CommunityArticle[] = [
  resumeSummaryArticle,
  bestResumeFormatArticle,
  noExperienceResumeArticle,
  atsFriendlyResumeArticle,
];

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
