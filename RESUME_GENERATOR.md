# AI Resume Generator Documentation

## Overview

The AI Resume Generator allows users to create professional, ATS-friendly resumes using Replicate's Mistral-7B model. The system takes user inputs (Name, Role, Skills, etc.) and generates a formatted HTML resume that can be previewed and downloaded as a PDF.

## 🏗️ Architecture

```
┌─────────────────┐
│  Frontend (React)│
│  Resume.tsx     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Express Server │
│  (Node.js)      │
└────────┬────────┘
         │
         ├───1. Construct Prompt──┐
         │                        │
         v                        v
┌──────────────┐          ┌──────────────┐
│  Replicate   │          │  Firestore   │
│  (Mistral-7B)│          │  (Database)  │
└──────────────┘          └──────────────┘
```

## 🚀 Setup Instructions

### 1. Dependencies

Already installed:
- `replicate`: For AI generation
- `html2pdf.js`: For client-side PDF export
- `firebase-admin`: For saving generated resumes

### 2. Environment Variables

Added to `server/.env`:
```env
# Replicate API Key (Free Tier)
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

### 3. Usage

1. Navigate to the **Resume** page.
2. Scroll to the **🤖 AI Resume Generator** section.
3. Fill in the required fields:
   - Full Name
   - Target Role
   - Skills
   - Experience (max 2000 chars)
   - Education (max 2000 chars)
4. Click **Generate Professional Resume**.
5. Wait for the AI to generate the HTML.
6. Review the preview.
7. Click **Download PDF** to save the file.

## 🔧 API Details

### Endpoint: `POST /api/generate-resume`

**Request Body:**
```json
{
  "uid": "user_id_123",
  "name": "John Doe",
  "role": "Frontend Developer",
  "skills": ["React", "TypeScript"],
  "experience": "...",
  "education": "...",
  "additionalInfo": "..."
}
```

**Response:**
```json
{
  "success": true,
  "resumeHTML": "<!DOCTYPE html>...",
  "resumeId": "firestore_doc_id",
  "message": "Resume generated successfully!"
}
```

## 💾 Data Storage

Resumes are saved in Firestore under the `generated_resumes` collection:

```json
{
  "uid": "user_123",
  "name": "John Doe",
  "role": "Description",
  "generatedHTML": "<html>...</html>",
  "generatedAt": "2024-03-20T10:00:00Z"
}
```

## 📝 prompt Engineering

The backend uses a specific prompt to ensure clean HTML output:
- Enforces strict HTML structure
- Inline CSS for styling (essential for html2pdf)
- ATS-friendly formatting (clean headers, bullet points)

## 🐛 Troubleshooting

- **Generation Fails:** Check server logs for Replicate API errors. The token provided is a free specific key, ensure it hasn't expired or hit limits.
- **PDF Formatting Issues:** The system uses `html2pdf.js` with specific settings (`scale: 2`) for high-quality output. Adjust specific CSS in the backend generator template if needed.
- **Input Length:** Fields are truncated to 2000 characters to prevent token limit errors with the AI model.
- **Offline Mode:** If the Replicate API fails (e.g. invalid token or quotas), the system automatically falls back to a template-based generation so the user still gets a result.

## 🎨 Template System

Three distinct resume templates are embedded in the backend:
1. **Modern Blue:** Clean sans-serif layout with blue accents.
2. **Classic Serif:** Traditional, elegant Times New Roman style.
3. **Clean Minimal:** Simple, content-focused layout with emerald highlights.

Users can select a template before generation, and the AI (or fallback) will use the corresponding structure.

## 🔮 Future Enhancements

- **Template Selection:** Add dropdown to select different visual styles (Modern, Classic, Creative).
- **Edit Mode:** Allow users to edit the generated HTML directly before downloading.
- **Cover Letter:** Generate a matching cover letter.
