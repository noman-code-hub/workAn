# Firebase Setup for Hirevo

This document explains the Firebase integration in the Hirevo application.

## Firebase Services Configured

The application uses the following Firebase services:

1. **Authentication** - User login/registration with:
   - Email/Password authentication
   - Google OAuth signin
   
2. **Firestore Database** - Stores user profiles and data

3. **Storage** - For file uploads (resumes, etc.)

4. **Analytics** - User behavior tracking

## Configuration Files

### `src/config/firebase.ts`
Contains Firebase initialization and exports Firebase services (auth, db, storage, analytics).

### Firebase Config
```javascript
{
  apiKey: "AIzaSyB1LtzuqH1IT7eryd1oiFVKkxR578VdNCc",
  authDomain: "workan-fb4ef.firebaseapp.com",
  projectId: "workan-fb4ef",
  storageBucket: "workan-fb4ef.firebasestorage.app",
  messagingSenderId: "213795286088",
  appId: "1:213795286088:web:a3d3da3807e5811395fc7d",
  measurementId: "G-0PEXF8E43Y"
}
```

## Authentication Flow

### How it Works

1. **Auth State Listener** (`src/contexts/AuthContext.tsx`):
   - Automatically syncs Firebase auth state with React state
   - Fetches user profile from Firestore when user logs in
   - Creates new user profile on first login

2. **Login Methods**:
   - `login(email, password)` - Email/password signin
   - `loginWithGoogle()` - Google OAuth popup signin
   - `register(email, password, name)` - Create new account
   - `logout()` - Sign out user

3. **User Profile Storage**:
   - User profiles stored in Firestore collection: `users/{userId}`
   - Profile includes: name, email, skills, subscription, credits, etc.

## Data Structure

### Firestore User Document (`users/{userId}`)
```typescript
{
  email: string;
  name: string;
  photoURL?: string;
  country?: string;
  profession?: string;
  skills: string[];
  resumeURL?: string;
  interviewReadinessScore?: number;
  subscription: 'free' | 'premium';
  credits: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Firebase Security Rules

Make sure to configure Firestore security rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own profile
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Next Steps

1. **Enable Authentication Methods** in Firebase Console:
   - Go to Authentication > Sign-in method
   - Enable Email/Password
   - Enable Google OAuth (add authorized domains)

2. **Set up Firestore Database**:
   - Create Firestore database in Firebase Console
   - Add security rules

3. **Optional - Set up Storage Rules** for resume uploads:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /resumes/{userId}/{fileName} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

## Usage Examples

### Login with Email/Password
```typescript
import { useAuth } from './contexts/AuthContext';

const { login } = useAuth();
await login('user@example.com', 'password123');
```

### Login with Google
```typescript
const { loginWithGoogle } = useAuth();
await loginWithGoogle();
```

### Update User Profile
```typescript
const { updateProfile } = useAuth();
await updateProfile({
  profession: 'Software Engineer',
  skills: ['React', 'Node.js', 'TypeScript']
});
```

## Environment Variables

No environment variables needed - Firebase config is in `src/config/firebase.ts`.

For production, consider moving sensitive config to environment variables:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
# etc...
```
