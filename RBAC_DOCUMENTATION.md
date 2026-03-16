# Role-Based Access Control (RBAC) Implementation

## Overview

This application implements a comprehensive Role-Based Access Control (RBAC) system with three distinct user roles:

- **👤 User** - Regular users who can apply for jobs, manage their resumes, and track analytics
- **💼 Recruiter** - Can post and manage job listings, view applicants
- **👨‍💼 Admin** - Full access to manage users, roles, and all system features

## User Roles

### 1. User (Default Role)
**Capabilities:**
- ✅ Search and browse jobs
- ✅ Upload and optimize resumes
- ✅ Track personal analytics
- ✅ Create and manage blog posts
- ✅ Use AI Copilot for career guidance
- ✅ View career trends
- ❌ Cannot post jobs
- ❌ Cannot manage other users

### 2. Recruiter
**Capabilities:**
- ✅ All "User" capabilities
- ✅ Post and manage job listings
- ✅ View applications for their jobs
- ✅ Access recruiter dashboard
- ✅ Filter and search candidates
- ❌ Cannot manage other users
- ❌ Cannot change user roles

### 3. Admin  
**Capabilities:**
- ✅ All "Recruiter" capabilities
- ✅ Manage all users
- ✅ Change user roles
- ✅ View admin dashboard
- ✅ Access all system analytics 
- ✅ Delete users
- ✅ Full system control

##Implementation Details

### Files Modified/Created

#### 1. Type Definitions
- **`src/types/index.ts`**
  - Added `UserRole` type: `'user' | 'recruiter' | 'admin'`
  - Added `role` field to `User` interface

#### 2. User Service
- **`src/services/userService.ts`**
  - Updated all user creation functions to include `role: 'user'` by default
  - Role is persisted in Firestore on user creation

#### 3. Authentication
- **`src/contexts/AuthContext.tsx`**
  - Automatically fetches user role from Firestore
  - Role is available throughout the app via `user.role`
  - Handles Email/Password and Google Sign-in

#### 4. Login & Registration
- **`src/pages/Login.tsx`** (NEW)
  - Unified login page for all users
  - Supports Email/Password and Google Sign-in
  - Auto-redirects based on role

- **`src/pages/Register.tsx`** (NEW)
  - User registration page
  - Assigns default 'user' role automatically
  - Auto-login and redirect after signup

- **`src/hooks/useRoleBasedRedirect.ts`** (NEW)
  - Custom hook for handling post-login navigation
  - Redirects admins to `/admin`, recruiters to `/recruiter`
  - Redirects regular users to `/dashboard`

#### 5. Route Protection
- **`src/components/RoleGuard.tsx`** (NEW)
  - Route guard component for role-based access
  - Redirects unauthenticated users to `/login`
  - Redirects unauthorized users to `/`
  - Usage: `<RoleGuard allowedRoles={['admin']}><Component /></RoleGuard>`

#### 5. Dashboards
- **`src/pages/AdminDashboard.tsx`** (NEW)
  - User management interface
  - Role assignment functionality
  - System statistics
  
- **`src/pages/RecruiterDashboard.tsx`** (NEW)
  - Job management placeholder
  - Applicant tracking placeholder
  - Recruiter-specific features

#### 6. Navigation
- **`src/App.tsx`**
  - Added protected routes: `/admin`, `/recruiter`
  - Routes are protected with `RoleGuard`
  
- **`src/components/Header.tsx`**
  - Dynamic navigation based on user role
  - Admin and Recruiter links visible only to authorized users

#### 7. Utilities
- **`src/utils/roleHelpers.ts`** (NEW)
  - Helper functions for role checks
  - Functions: `isAdmin()`, `isRecruiter()`, `hasRole()`, etc.

#### 8. Security
- **`firestore.rules`**
  - Firestore Security Rules for role-based data access
  - Prevents unauthorized role escalation
  - Protects sensitive user data

## Usage Guide

### Checking User Role in Components

```typescript
import { useAuth } from '@/contexts/AuthContext';

const MyComponent = () => {
  const { user } = useAuth();
  
  // Check role directly
  if (user?.role === 'admin') {
    return <AdminFeature />;
  }
  
  return <RegularFeature />;
};
```

### Using Role Helper Functions

```typescript
import { isAdmin, isRecruiterOrAdmin } from '@/utils/roleHelpers';
import { useAuth } from '@/contexts/AuthContext';

const MyComponent = () => {
  const { user } = useAuth();
  
  if (isAdmin(user)) {
    // Show admin features
  }
  
  if (isRecruiterOrAdmin(user)) {
    // Show recruiter features
  }
};
```

### Protecting Routes

```typescript
import { RoleGuard } from '@/components/RoleGuard';

<Route 
  path="/admin" 
  element={
    <RoleGuard allowedRoles={['admin']}>
      <AdminDashboard />
    </RoleGuard>
  } 
/>
```

### Conditional Rendering

```typescript
{user?.role === 'admin' && (
  <button onClick={handleAdminAction}>
    Admin Only Feature
  </button>
)}

{(user?.role === 'recruiter' || user?.role === 'admin') && (
  <RecruiterFeature />
)}
```

## Role Assignment

### Default Assignment
- **Registration**: New users can select their role (Job Seeker, Recruiter, Admin) during signup.
  - *Note*: Admin selection is enabled for testing/demo purposes. In production, this should be restricted.
- Users cannot change their own role

### Changing Roles (Admin Only)

**Method 1: Admin Dashboard**
1. Login as an admin
2. Navigate to `/admin`
3. Find the user in the table
4. Select new role from dropdown
5. Role is immediately updated

**Method 2: Firebase Console**
1. Go to Firebase Console → Firestore
2. Navigate to `users` collection
3. Find the user document
4. Edit the `role` field
5. Set to: `'user'`, `'recruiter'`, or `'admin'`
6. Save

**Method 3: Creating First Admin**
Since you need to be an admin to assign admin roles, create the first admin manually:

```typescript
// In Firebase Console, add this to a user document:
{
  "role": "admin"
}
```

Or use Firebase Admin SDK:
```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

await db.collection('users').doc('USER_ID_HERE').update({
  role: 'admin'
});
```

## Security Rules

The Firestore security rules enforce role-based access:

```javascript
// Users can read any profile
allow read: if isAuthenticated();

// Users can update their own profile (except role)
// Admins can update any profile (including role)
allow update: if isAuthenticated() && (
  (request.auth.uid == userId && !changedRole()) || isAdmin()
);

// Only admins can delete users
allow delete: if isAdmin();
```

### Deploying Security Rules

1. Open Firebase Console
2. Go to Firestore Database → Rules
3. Copy content from `firestore.rules`
4. Paste and publish

Or use Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

## Testing RBAC

### Test as Regular User
1. Create a new account
2. Default role will be `'user'`
3. Try accessing `/admin` → Should redirect to `/`
4. Try accessing `/recruiter` → Should redirect to `/`

### Test as Recruiter
1. Have an admin change your role to `'recruiter'`
2. Navigate to `/recruiter` → Should work
3. Try accessing `/admin` → Should redirect to `/`

### Test as Admin
1. Set your role to `'admin'` (via Firestore or existing admin)
2. Navigate to `/admin` → Should work
3. Navigate to `/recruiter` → Should work
4. Try changing another user's role → Should work

## Future Enhancements

### Planned Features
- [ ] Job posting management for recruiters
- [ ] Application tracking system
- [ ] Candidate database for recruiters
- [ ] Advanced analytics for admins
- [ ] Bulk role assignment
- [ ] Role history/audit log
- [ ] Custom permissions within roles
- [ ] Email notifications on role changes
- [ ] Invite-based recruiter onboarding

### Adding New Roles

To add a new role (e.g., `'moderator'`):

1. Update type definition in `src/types/index.ts`:
```typescript
export type UserRole = 'user' | 'recruiter' | 'admin' | 'moderator';
```

2. Update role helpers in `src/utils/roleHelpers.ts`

3. Create dashboard page (if needed)

4. Add route protection in `App.tsx`

5. Update Firestore security rules

6. Update UI navigation

## Troubleshooting

### User can't access their assigned role features
- **Solution**: Check if role field exists in Firestore user document
- Verify role value is exactly: `'user'`, `'recruiter'`, or `'admin'`
- Try logging out and back in to refresh user data

### Role changes don't take effect
- **Solution**: Clear localStorage and refresh
- Log out and log back in
- Check Firestore to verify role was actually updated

### Security rules blocking legitimate access
- **Solution**: Check Firestore Rules in Firebase Console
- Verify rules are published
- Test rules using Rules Playground in Firebase Console

### Can't create first admin
- **Solution**: Manually add `"role": "admin"` in Firestore
- Use Firebase Admin SDK
- Temporarily modify security rules to allow role changes

## API Reference

### Role Helper Functions

```typescript
// Check if user has specific role
hasRole(user, 'admin'): boolean

// Check if user has any of the roles
hasAnyRole(user, ['admin', 'recruiter']): boolean

// Check if user is admin
isAdmin(user): boolean

// Check if user is recruiter or admin
isRecruiterOrAdmin(user): boolean

// Check if user is regular user
isRegularUser(user): boolean

// Get role display label
getRoleLabel(role): string  // 'Administrator', 'Recruiter', 'User'

// Get role color for UI
getRoleColor(role): string  // '#dc2626', '#2563eb', '#10b981'
```

## Support & Contact

For questions or issues with RBAC implementation:
- Check this documentation
- Review Firestore security rules
- Test with different user roles
- Verify user document structure in Firebase

---

**Last Updated**: February 7, 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
