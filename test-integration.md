# Resume Score Integration Test

## Quick Test
1. Open your app at http://localhost:5173
2. Go to your Profile page
3. Upload a resume (or use existing one)
4. Click "Refresh Score" button
5. Watch the score ring animate with your match percentage!

## API Test (Direct)
```bash
# Test with a simple text file
echo "Software Engineer with Python experience" > test-resume.txt

# Direct test to Resume-Matcher backend
curl -X POST -F "resume=@test-resume.txt" http://localhost:8000/api/v1/match

# Test through your Node.js API
curl -X POST -F "resume=@test-resume.txt" http://localhost:5000/api/upload-resume
```

## Expected Response
```json
{
  "success": true,
  "score": 10,
  "keywords_matched": ["Python", "Software"],
  "missing_skills": ["Management", "Development"],
  "summary": "Your resume matches 10% of the job requirements."
}
```

## Verification Checklist
- ✅ Resume-Matcher running on :8000
- ✅ Node.js server running on :5000
- ✅ React app running on :5173  
- ✅ Firestore has analytics.resumeScore field
- ✅ Profile page shows score ring
- ✅ "Refresh Score" button triggers sync
