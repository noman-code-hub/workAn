# 🚀 CareerPilot - AI-Powered SaaS Career Platform

An advanced AI-powered career platform built with React, TypeScript, and modern web technologies.

## ✨ Features

### Core Features
- **🔐 User Authentication**: Email/Google login system with secure session management
- **📊 Personalized Dashboard**: Real-time stats, job recommendations, and activity feed
- **👤 Profile Management**: Complete profile system with skills, profession, and resume upload
- **💼 Job Finder**: AI-powered job search with match scores, filters, and bookmarking
- **📝 Resume Optimizer**: AI analysis for resume improvement and ATS optimization
- **📈 Career Trends**: Future demand projections and market insights
- **🤖 AI Copilot**: Intelligent chat assistant for career guidance
- **💳 Subscription System**: Free and Premium tiers with feature gating

### Technical Features
- Modern, responsive UI with glassmorphism effects
- Dark mode support
- Premium animations and micro-interactions
- Fully typed with TypeScript
- Component-based architecture
- Optimized performance

## 🛠 Tech Stack

- **Frontend**: React 19.2 + TypeScript
- **Routing**: React Router DOM
- **Styling**: Vanilla CSS with CSS Custom Properties
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Build Tool**: Vite with Rolldown
- **Linting**: ESLint with TypeScript support

## 📁 Project Structure

```
Hirevo/
├── src/
│   ├── components/         # Reusable UI components
│   │   └── Layout.tsx     # Main layout with sidebar
│   ├── pages/             # Page components
│   │   ├── Dashboard.tsx  # Overview page with stats
│   │   ├── Login.tsx      # Authentication page
│   │   ├── Jobs.tsx       # Job finder page
│   │   └── AICopilot.tsx  # AI chat assistant
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx # Authentication state
│   ├── types/             # TypeScript definitions
│   │   └── index.ts       # All type definitions
│   ├── index.css          # Global styles & design system
│   ├── App.tsx            # Main app with routing
│   └── main.tsx           # App entry point
├── public/                # Static assets
├── index.html            # HTML template
└── package.json          # Dependencies

```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## 🎨 Design System

The platform uses a comprehensive design system with:

- **CSS Custom Properties** for theming
- **Consistent spacing scale** (xs, sm, md, lg, xl, 2xl)
- **Color tokens** for primary, secondary, success, warning, danger
- **Typography scale** with Inter font family
- **Standardized shadows** and transitions
- **Utility classes** for common patterns
- **Responsive breakpoints**

### Key Design Principles

1. **Premium Aesthetics**: Glassmorphism, gradients, and smooth animations
2. **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation
3. **Performance**: Optimized animations and lazy loading
4. **Consistency**: Reuse design tokens across all components

## 🔐 Authentication

Currently implements mock authentication. To integrate real authentication:

### Firebase Integration
1. Create a Firebase project
2. Add Firebase config to `src/services/firebase.ts`
3. Update `AuthContext.tsx` to use Firebase Auth
4. Enable Google OAuth in Firebase Console

Example Firebase setup:
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  // ... other config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

## 📊 Data & State Management

- **Authentication**: React Context API
- **Local State**: useState hooks
- **Future**: Consider React Query for server state

## 🤖 AI Integration

To integrate real AI features:

### OpenAI Integration
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY
});

// Resume analysis
async function analyzeResume(resumeText: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{
      role: "system",
      content: "Analyze this resume and provide improvement suggestions"
    }, {
      role: "user",
      content: resumeText
    }]
  });
  return response.choices[0].message.content;
}
```

## 💾 Database Integration

Recommended database setup:

### Firebase Firestore
```typescript
// Collections structure
/users/{userId}
  - email, name, profession, skills, etc.
/jobs/{jobId}
  - title, company, location, etc.
/applications/{applicationId}
  - userId, jobId, status, date
/resumes/{resumeId}
  - userId, fileURL, analysis
```

### PostgreSQL (Alternative)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  profession VARCHAR,
  skills JSONB,
  subscription VARCHAR DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  title VARCHAR NOT NULL,
  company VARCHAR NOT NULL,
  location VARCHAR,
  type VARCHAR,
  salary JSONB,
  skills JSONB,
  posted_date TIMESTAMP
);
```

## 💳 Payment Integration

To add real subscription payments:

### Stripe Integration
```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLIC_KEY);

async function createCheckoutSession() {
  const stripe = await stripePromise;
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
  });
  const session = await response.json();
  await stripe.redirectToCheckout({ sessionId: session.id });
}
```

## 📱 Progressive Web App (PWA)

To make this a PWA:

1. Add `vite-plugin-pwa` to `vite.config.ts`
2. Create `manifest.json`
3. Add service worker for offline support
4. Add install prompt UI

## 🧪 Testing

Recommended testing setup:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Example test:
```typescript
import { render, screen } from '@testing-library/react';
import { Dashboard } from './pages/Dashboard';

test('renders dashboard heading', () => {
  render(<Dashboard />);
  expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
});
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
```

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core UI/UX
- ✅ Authentication flow
- ✅ Dashboard & navigation
- ✅ Job listing
- ✅ AI Copilot chat

### Phase 2 (Next)
- Firebase integration
- Resume upload & storage
- Real job data API
- OpenAI integration
- Email notifications

### Phase 3 (Future)
- Payment processing
- Advanced analytics
- Mobile app (React Native)
- Interview scheduling
- Skill assessments
- Networking features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Design inspired by modern SaaS platforms
- Icons by Lucide
- Fonts by Google Fonts

---

Built with ❤️ using React + TypeScript

## Firebase Hosting + External API (Supabase)

This project now deploys only the frontend to Firebase Hosting. Firebase Functions are not used.

### Environment

Set your API base URL in `.env` (or your production env file):

```bash
VITE_API_BASE=https://YOUR-PROJECT.supabase.co/functions/v1/api
```

Use a function-path base URL where `api` is your function name. If your function name differs, replace `/api` accordingly.

### Firebase Hosting Config

Use only SPA hosting rewrite in `firebase.json`:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

### Deploy

```bash
npm run build
firebase deploy --only "hosting"
```

Deploy the Supabase Edge Function named `api` (required for `VITE_API_BASE=.../api`):

```bash
# one-time: install and login
npm i -g supabase
supabase login

# from project root
supabase link --project-ref bwrircyazzakdstjapxq
supabase secrets set SERPAPI_KEY=your_serpapi_key
supabase functions deploy api --no-verify-jwt
```

### Supabase CORS (Edge Functions / Backend)

Make sure your backend returns CORS headers:

```ts
const origin = req.headers.get("origin") ?? "";
const allow =
  origin === "https://workan-fb4ef.web.app" ||
  origin === "https://workan-fb4ef.firebaseapp.com" ||
  /^https:\/\/workan-fb4ef--[a-z0-9-]+\.web\.app$/i.test(origin);

if (allow) headers.set("Access-Control-Allow-Origin", origin);
headers.set("Vary", "Origin");
headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
```

### Verify

1. Open browser DevTools > Network.
2. Confirm requests go to your `VITE_API_BASE` domain (not your Firebase Hosting domain).
3. Confirm API responses are valid JSON and no request returns `index.html`.
