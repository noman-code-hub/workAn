# Resume-Matcher Integration Documentation

## Overview

The Resume-Matcher integration provides AI-powered resume analysis and optimization features by combining:
- **Resume-Matcher**: Python-based ATS (Applicant Tracking System) matching engine
- **OpenAI GPT-4**: AI-powered resume improvement suggestions
- **Firestore**: Cloud storage for analysis history and tracking

## 🏗️ Architecture

```
┌─────────────────┐
│  Frontend (React│
│  Resume.tsx)    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Express Server │
│  (Node.js)      │
└────────┬────────┘
         │
         ├──────────┐
         │          │
         v          v
┌──────────────┐  ┌──────────────┐
│ Resume-Matcher│  │   OpenAI     │
│ (FastAPI      │  │   GPT-4      │
│  Python)      │  │              │
└───────────────┘  └──────────────┘
         │          │
         └──────┬───┘
                v
         ┌──────────────┐
         │  Firestore   │
         └──────────────┘
```

## 📁 Key Files

### Backend
- `server/routes/resume-analysis.js` - Main analysis endpoint
- `server/routes/career.js` - Career advisor endpoint
- `server/.env` - Configuration (OpenAI key, Resume-Matcher URL)

### Frontend
- `src/pages/Resume.tsx` - Complete resume builder UI with analysis dashboard

### Resume-Matcher
- `Resume-Matcher/apps/backend/app/routers/match.py` - Matching logic
- `Resume-Matcher/apps/backend/.env` - LLM configuration

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
# Server dependencies (OpenAI + Firebase Admin)
cd server
npm install openai firebase-admin

# Already installed:
# - express
# - axios
# - cors
```

### 2. Configure Environment Variables

**`server/.env`:**
```env
# OpenAI API Key for AI improvements
OPENAI_API_KEY=sk-...your_key_here

# Resume-Matcher Backend URL
RESUME_MATCHER_URL=http://localhost:8000

# Adzuna API (for job search)
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key

# Server config
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**`Resume-Matcher/apps/backend/.env`:**
```env
# Local mode (no API key needed for basic matching)
LLM_PROVIDER=local
LLM_MODEL=none

# OR for advanced features, use OpenAI:
# LLM_PROVIDER=openai
# LLM_MODEL=gpt-4
# OPENAI_API_KEY=sk-...your_key_here
```

### 3. Start Both Servers

```bash
# Terminal 1: Start Resume-Matcher backend
cd Resume-Matcher
npm run dev:backend  # Runs on port 8000

# Terminal 2: Start main application
cd ..
npm run dev  # Runs frontend (3000) and Express server (5000)
```

## 🔄 How It Works

### Step 1: User Fills Resume Data
User enters in `Resume.tsx`:
- Target Role
- Professional Summary
- Skills
- Experience
- Education
- (Optional) Job Description for matching

### Step 2: Analysis Request
Frontend sends POST to `/api/analyze-resume`:
```javascript
{
  "uid": "user123",
  "targetRole": "Senior Frontend Developer",
  "skills": ["React", "TypeScript", "Node.js"],
  "summary": "Experienced developer...",
  "experience": "5 years building web apps...",
  "education": "BS Computer Science",
  "jobDescription": "We're looking for..." // optional
}
```

### Step 3: Backend Processing

**resume-analysis.js:**
1. Constructs resume text from structured data
2. Calls Resume-Matcher API (`/api/v1/match`)
3. Gets match score, keywords matched, missing skills
4. If OpenAI is configured:
   - Sends resume + analysis to GPT-4
   - Gets improved summary, recommendations, skills to add
5. Saves complete analysis to Firestore
6. Returns combined result to frontend

### Step 4: Display Results

Frontend shows:
- **ATS Match Score** (0-100%) from Resume-Matcher
- **Matched Keywords** (green badges)
- **Missing Skills** (red badges)
- **AI Improvements** (if OpenAI configured):
  - Optimized summary paragraph
  - Specific action items
  - Recommended skills to add

## 📊 Firestore Structure

### `resume_analyses` Collection
```json
{
  "uid": "user123",
  "targetRole": "Senior Frontend Developer",
  "resumeData": {
    "summary": "...",
    "skills": ["React", "TypeScript"],
    "experience": "...",
    "education": "..."
  },
  "analysis": {
    "score": 82,
    "keywords_matched": ["React", "JavaScript", "TypeScript"],
    "missing_skills": ["Next.js", "AWS", "Docker"],
    "summary": "Your resume matches 82% of job requirements",
    "aiImprovement": {
      "improvedSummary": "Accomplished Senior Frontend...",
      "improvements": [
        "Add quantifiable metrics to achievements",
        "Include cloud platform experience"
      ],
      "recommendedSkills": ["Next.js", "AWS", "Docker"]
    }
  },
  "createdAt": "2026-02-08T12:00:00Z"
}
```

### `career_recommendations` Collection
```json
{
  "uid": "user123",
  "currentRole": "Frontend Developer",
  "skills": ["React", "Firebase", "Tailwind"],
  "experience": "1 year",
  "education": "BS Computer Science",
  "aiRecommendations": {
    "nextRoles": ["Full Stack Developer", "UI Engineer"],
    "skillsToLearn": ["Node.js", "Next.js", "TypeScript"],
    "timeline": "6-8 months to mid-level",
    "summary": "You're on the right track..."
  },
  "createdAt": "2026-02-08T12:30:00Z"
}
```

## 🎯 Feature Workflow

### Resume Analysis Flow
```
User fills form
  ↓
Click "Analyze My Resume"
  ↓
[Frontend] POST /api/analyze-resume
  ↓
[Backend] Construct resume text
  ↓
[Backend] → Resume-Matcher: POST /api/v1/match
  ↓
[Resume-Matcher] Returns score + keywords
  ↓
[Backend] → OpenAI: Generate improvements
  ↓
[OpenAI] Returns optimized content
  ↓
[Backend] Save to Firestore
  ↓
[Backend] Return combined result
  ↓
[Frontend] Display beautiful results dashboard
```

### Career Advisor Flow
```
User fills career info
  ↓
Click "Get Career Advice"
  ↓
[Frontend] POST /api/generate-career-advice
  ↓
[Backend] → OpenAI: Analyze career path
  ↓
[OpenAI] Returns next roles, skills, timeline
  ↓
[Backend] Save to Firestore
  ↓
[Frontend] Display career roadmap
```

## 🔧 API Endpoints

### POST `/api /analyze-resume`
**Request:**
```json
{
  "uid": "string",
  "targetRole": "string",
  "skills": ["string"],
  "summary": "string",
  "experience": "string",
  "education": "string",
  "jobDescription": "string" // optional
}
```

**Response:**
```json
{
  "score": 82,
  "keywords_matched": ["React", "TypeScript"],
  "missing_skills": ["Docker", "AWS"],
  "summary": "Analysis summary",
  "aiImprovement": {
    "improvedSummary": "...",
    "improvements": ["..."],
    "recommendedSkills": ["..."]
  }
}
```

### POST `/api/generate-career-advice`
**Request:**
```json
{
  "uid": "string",
  "currentRole": "string",
  "skills": ["string"],
  "experience": "string",
  "education": "string"
}
```

**Response:**
```json
{
  "nextRoles": ["Full Stack Developer", "..."],
  "skillsToLearn": ["Node.js", "..."],
  "timeline": "6-8 months",
  "summary": "Motivational summary"
}
```

## 🎨 UI Features

### Resume Builder Section
- Clean, modern form with TailwindCSS
- Real-time validation
- Loading states with spinners
- Error handling with user-friendly messages

### Analysis Results Dashboard
- **Gradient score card** (blue→purple)
- **Color-coded badges**:
  - Green for matched keywords
  - Red for missing skills
  - Blue for AI recommendations
- **Collapsible sections** for detailed feedback
- **Smooth animations** (fade-in on results)

## 🛠️ Troubleshooting

### Resume-Matcher Connection Failed
**Symptom:** "Failed to analyze resume" error
**Fix:**
1. Ensure Resume-Matcher is running: `cd Resume-Matcher && npm run dev:backend`
2. Check URL in `server/.env`: `RESUME_MATCHER_URL=http://localhost:8000`
3. Test health: `curl http://localhost:8000/health`

### OpenAI API Errors
**Symptom:** Analysis works but no AI improvements shown
**Fix:**
1. Add OpenAI key to `server/.env`: `OPENAI_API_KEY=sk-...`
2. Check API quota/billing
3. System will use fallback suggestions if OpenAI fails

### Firestore Save Errors
**Symptom:** "Firestore save failed" in console
**Fix:**
1. Ensure Firebase Admin is initialized in `server.js`
2. Check Firebase project ID: `workan-fb4ef`
3. Analysis still returns to frontend even if save fails

## 📈 Future Enhancements

### Planned Features
1. **PDF Export** - Generate formatted resume PDF
2. **Version History** - Track improvements over time
3. **Job Matching** - Compare resume against saved jobs
4. **Progress Tracker** - Show score improvements
5. **Templates** - Multiple resume template styles
6. **Batch Analysis** - Analyze against multiple job descriptions

### Integration Ideas
- **LinkedIn Import** - Auto-fill from LinkedIn profile
- **Cover Letter Generation** - AI-generated cover letters
- **Interview Prep** - Generate questions based on resume
- **Skills Gap Analysis** - Recommend courses/certifications

## 📝 Notes

- Resume-Matcher can run without OpenAI (local mode)
- OpenAI is optional for AI improvements
- All data is saved to Firestore for tracking
- Frontend gracefully handles backend failures
- System provides fallback mock data if services unavailable

## 🔐 Security Considerations

- API keys stored in `.env` (not committed)
- User data saved with uid for access control
- Firestore rules should restrict writes to authenticated users
- Resume data is private to the user

## 📚 References

- [Resume-Matcher Docs](Resume-Matcher/README.md)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore Security Rules](firestore.rules)
