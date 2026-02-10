# 🔑 Adzuna API Setup Guide

## ⚠️ Current Status

Your current Adzuna API credentials are **INVALID** or have been **REVOKED**. The application is currently using **mock data** as a fallback.

## 📋 How to Get New API Credentials

### Step 1: Sign Up for Adzuna API
1. Go to Adzuna Developer Portal: https://developer.adzuna.com/
2. Click on "Sign Up" or "Get API Keys"
3. Fill in your details (name, email, purpose of use)
4. Verify your email address

### Step 2: Create an Application
1. Log in to your Adzuna developer account
2. Navigate to "My Applications"
3. Click "Create New Application"
4. Fill in:
   - **Application Name**: Hirevo Job Platform (or your preference)
   - **Description**: Job search and career platform
   - **Website URL**: http://localhost:5173 (or your actual domain)
5. Submit the form

### Step 3: Get Your Credentials
After creating the application, you'll receive:
- **Application ID** (app_id)
- **Application Key** (app_key)

### Step 4: Update Your .env File
1. Open `c:\Hirevo\server\.env`
2. Replace the existing credentials:

```env
# Adzuna API Credentials
ADZUNA_APP_ID=your_new_app_id_here
ADZUNA_APP_KEY=your_new_app_key_here

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

3. Save the file
4. Restart your backend server (it should auto-restart if using nodemon)

## 🧪 Testing Your New Credentials

Once you've updated the credentials:

1. Your backend server will automatically restart
2. Open your browser console
3. Go to the Jobs page or Dashboard
4. You should see **real job listings** instead of mock data
5. Check the server console for:
   ```
   ✅ Adzuna API Response: Status 200
   📊 Found X jobs
   ```

## 🌍 Supported Countries

Adzuna API supports these countries:
- `us` - United States
- `gb` - United Kingdom
- `ca` - Canada
- `au` - Australia
- `in` - India
- `de` - Germany
- `fr` - France
- And many more...

## 📚 API Documentation

- API Docs: https://developer.adzuna.com/docs/search
- Rate Limits: Check your account tier
- Endpoints: https://api.adzuna.com/v1/api/jobs/{country}/search/{page}

## 🛠️ Troubleshooting

### Still Getting 400 Errors?
1. Double-check your credentials are correct (no extra spaces)
2. Verify your account is active and not suspended
3. Check if you've exceeded rate limits
4. Try a different country code (e.g., 'us' instead of 'gb')

### Mock Data Not Showing?
- Check server console for error messages
- Restart the backend server manually
- Clear browser cache and reload

## ℹ️ Current Fallback Behavior

When API credentials are invalid:
- ✅ App continues to work with **mock data**
- ⚠️ Console shows warning: "Using sample data - Please configure valid Adzuna API credentials"
- 📊 Returns up to 20 sample job listings
- 🏷️ Mock jobs are tagged with `mock: true` in the API response

This ensures your development and testing can continue uninterrupted!
