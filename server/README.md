# CareerPilot Backend Server

Node.js backend API server for CareerPilot that integrates with Adzuna Jobs API.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Start Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

## 📡 API Endpoints

### Search Jobs
```
GET /api/jobs/search
```

**Query Parameters:**
- `query` - Job title or keywords (e.g., "software engineer", "designer")
- `location` - Location (e.g., "London", "Manchester", "Remote")
- `country` - Country code (default: "gb")
- `page` - Page number (default: 1)
- `results_per_page` - Results per page (default: 20, max: 50)
- `salary_min` - Minimum salary
- `salary_max` - Maximum salary
- `contract_type` - Contract type: `full_time`, `part_time`, `contract`, `permanent`
- `category` - Job category
- `sort_by` - Sort by: `relevant`, `date`, `salary` (default: relevant)

**Example Requests:**
```bash
# Search for software engineer jobs in London
GET http://localhost:5000/api/jobs/search?query=software%20engineer&location=London

# Search with salary filter
GET http://localhost:5000/api/jobs/search?query=developer&location=London&salary_min=50000&salary_max=80000

# Search for part-time jobs
GET http://localhost:5000/api/jobs/search?query=designer&location=Manchester&contract_type=part_time

# Pagination
GET http://localhost:5000/api/jobs/search?query=developer&page=2&results_per_page=30
```

**Response:**
```json
{
  "success": true,
  "count": 1250,
  "results": [
    {
      "id": "12345",
      "title": "Senior Software Engineer",
      "company": "TechCorp Ltd",
      "location": "London, UK",
      "type": "full-time",
      "salary": {
        "min": 60000,
        "max": 80000,
        "currency": "GBP"
      },
      "description": "We are looking for...",
      "requirements": [],
      "skills": ["JavaScript", "React", "Node.js"],
      "tags": ["Full-time", "IT Jobs"],
      "postedDate": "2024-01-28T10:00:00Z",
      "applyUrl": "https://...",
      "matchScore": 85
    }
  ],
  "page": 1,
  "total_pages": 63
}
```

### Get Job Categories
```
GET /api/jobs/categories?country=gb
```

**Response:**
```json
{
  "success": true,
  "categories": [
    {
      "label": "IT Jobs",
      "tag": "it-jobs"
    },
    {
      "label": "Engineering Jobs",
      "tag": "engineering-jobs"
    }
  ]
}
```

### Health Check
```
GET /health
```

## 🔧 Environment Variables

Create a `.env` file in the server directory:

```env
# Adzuna API Credentials
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

## 📦 Available Countries

The Adzuna API supports multiple countries. Change the `country` parameter:

- `gb` - United Kingdom
- `us` - United States
- `ca` - Canada
- `au` - Australia
- `de` - Germany
- `fr` - France
- `nl` - Netherlands
- `nz` - New Zealand
- `at` - Austria
- `br` - Brazil
- `in` - India
- `pl` - Poland
- `za` - South Africa
- `sg` - Singapore

## 🛠 Tech Stack

- **Express.js** - Web framework
- **Axios** - HTTP client for API requests
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management
- **Nodemon** - Development auto-restart

## 📝 Features

✅ Job search with multiple filters  
✅ Salary range filtering  
✅ Contract type filtering  
✅ Location-based search  
✅ Pagination support  
✅ Data transformation to match frontend format  
✅ Automatic skill extraction from descriptions  
✅ Match score calculation  
✅ Job categories endpoint  
✅ Error handling  
✅ CORS enabled for React frontend  
✅ Request logging  

## 🔗 Integration with Frontend

Update your frontend Jobs page to use the API:

```javascript
// In src/pages/Jobs.tsx
const fetchJobs = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams({
      query: searchQuery,
      location: locationFilter,
      contract_type: typeFilter,
      page: currentPage.toString(),
      results_per_page: '20'
    });

    const response = await fetch(`http://localhost:5000/api/jobs/search?${params}`);
    const data = await response.json();
    
    if (data.success) {
      setJobs(data.results);
      setTotalPages(data.total_pages);
    }
  } catch (error) {
    console.error('Error fetching jobs:', error);
  } finally {
    setLoading(false);
  }
};
```

## 🚨 Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Failed to fetch jobs",
  "message": "Detailed error message"
}
```

## 📈 Future Enhancements

- [ ] Caching with Redis
- [ ] Rate limiting
- [ ] User authentication integration
- [ ] Job bookmarking API
- [ ] Application tracking
- [ ] Email alerts for new jobs
- [ ] Job recommendations based on user profile
- [ ] Analytics and reporting

## 📄 License

MIT
