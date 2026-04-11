// Force reload
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jobsRouter from './routes/jobs.js';
import resumeRouter from './routes/resume.js';
import careerRouter from './routes/career.js';
import resumeAnalysisRouter from './routes/resume-analysis.js';
import resumeGeneratorRouter from './routes/resume-generator.js';
import templatesRouter from './routes/templates.js';
import seoRouter from './routes/seo.js';
import copilotRouter from './routes/copilot.js';
import admin from 'firebase-admin';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 5000;
const FIREBASE_PROJECT_ID = 'workan-fb4ef';

const defaultAllowedOrigins = [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:5174', 'http://127.0.0.1:5174',
    'http://localhost:5175', 'http://127.0.0.1:5175',
    'http://localhost:5176', 'http://127.0.0.1:5176',
    `https://${FIREBASE_PROJECT_ID}.web.app`,
    `https://${FIREBASE_PROJECT_ID}.firebaseapp.com`,
];

const extraOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...extraOrigins]);
const firebasePreviewRegex = new RegExp(`^https://${FIREBASE_PROJECT_ID}--[a-z0-9-]+\\.web\\.app$`, 'i');

const corsOptions = {
    origin(origin, callback) {
        // Non-browser clients (curl/postman/server-to-server) may not send Origin
        if (!origin) return callback(null, true);

        if (allowedOrigins.has(origin) || firebasePreviewRegex.test(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Initialize Firebase Admin
try {
    admin.initializeApp({
        projectId: "workan-fb4ef"
    });
    console.log("🔥 Firebase Admin initialized");
} catch (error) {
    console.warn("⚠️ Firebase Admin initialization failed. Firestore saves might fail.", error.message);
}

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/jobs', jobsRouter);
app.use('/api', resumeRouter);
app.use('/api', careerRouter);
app.use('/api', resumeAnalysisRouter);
app.use('/api', resumeGeneratorRouter);
app.use('/api', copilotRouter);
app.use('/api/templates', templatesRouter);
app.use('/', seoRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'CareerPilot API Server is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
});
