// User Types
export type UserRole = 'user' | 'recruiter' | 'admin';

export interface User {
    id: string;
    email: string;
    name: string;
    role?: UserRole; // Role-based access control
    photoURL?: string;
    bannerURL?: string;
    country?: string;
    profession?: string;
    skills: string[];
    resumeURL?: string;
    interviewReadinessScore?: number;
    subscription: SubscriptionTier;
    credits: number;
    createdAt: Date;
    updatedAt: Date;
    about?: string;
    analytics?: {
        resumeScore?: number;
        scoreHistory?: Array<{
            score: number;
            date: Date;
            resumeUrl?: string;
        }>;
        matchedSkills?: string[];
        missingSkills?: string[];
        keywordsMatched?: string[];
        resumeMetadata?: {
            name?: string;
            email?: string;
            phone?: string;
            skills?: string[];
            education?: string[];
            experience?: string[];
            summary?: string;
        };
        aiFeedback?: string;
        lastAnalyzed?: Date;
    };
}

// Blog/Post Types
export interface BlogPost {
    id: string;
    userId: string;
    authorName: string;
    authorAvatar?: string;
    title?: string;
    content: string;
    imageURL?: string;
    likes: number;
    commentsCount: number;
    type: 'blog' | 'community';
    createdAt: Date;
    updatedAt: Date;
}

export interface PostComment {
    id: string;
    postId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    createdAt: Date;
}

export type SubscriptionTier = 'free' | 'premium';

export interface Subscription {
    tier: SubscriptionTier;
    startDate: Date;
    endDate?: Date;
    autoRenew: boolean;
}

// Job Types
export interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    type: 'full-time' | 'part-time' | 'contract' | 'remote';
    salary: {
        min: number;
        max: number;
        currency: string;
    };
    salaryText?: string;
    description: string;
    requirements: string[];
    skills: string[];
    tags: string[];
    postedDate: Date | string; // Can be Date object or ISO string from API
    postedBy?: string; // UID of the recruiter who posted it
    applicantsCount?: number;
    applyUrl?: string; // Optional URL to apply
    isBookmarked?: boolean;
    matchScore?: number;
}

export interface JobApplication {
    id: string;
    jobId: string;
    userId: string;
    status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';
    appliedDate: Date;
    notes?: string;
}

// Resume Types
export interface Resume {
    id: string;
    userId: string;
    fileName: string;
    fileURL: string;
    fileType: 'pdf' | 'docx';
    uploadDate: Date;
    analysis?: ResumeAnalysis;
}

export interface ResumeAnalysis {
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: ResumeSuggestion[];
    keywords: string[];
    atsScore: number;
    grammar: GrammarAnalysis;
}

export interface ResumeSuggestion {
    category: 'structure' | 'grammar' | 'keywords' | 'formatting' | 'content';
    severity: 'low' | 'medium' | 'high';
    message: string;
    suggestion: string;
}

export interface GrammarAnalysis {
    errors: number;
    score: number;
    issues: Array<{
        type: string;
        message: string;
        line: number;
    }>;
}

// Career Trend Types
export interface CareerTrend {
    field: string;
    growthRate: number;
    demand: 'low' | 'medium' | 'high' | 'very-high';
    averageSalary: {
        min: number;
        max: number;
        currency: string;
    };
    topSkills: string[];
    outlook: string;
    projections: TrendProjection[];
}

export interface TrendProjection {
    year: number;
    jobOpenings: number;
    averageSalary: number;
}

// AI Chat Types
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface ChatConversation {
    id: string;
    userId: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
    title?: string;
}

// Activity Types
export interface ActivityLog {
    id: string;
    userId: string;
    type: 'job_application' | 'resume_upload' | 'job_search' | 'ai_chat' | 'profile_update';
    description: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

// Notification Types
export interface Notification {
    id: string;
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    read: boolean;
    timestamp: Date;
    actionURL?: string;
}

export * from './resumeTemplate';
