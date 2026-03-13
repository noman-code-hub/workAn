/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceAccountPath || !supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required env vars: FIREBASE_SERVICE_ACCOUNT_PATH, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(serviceAccountPath), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const firestore = admin.firestore();

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const toISO = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const ensureTimestamp = (value, fallback) => toISO(value) || fallback || new Date().toISOString();

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const upsertRows = async (table, rows, onConflict = 'id') => {
  if (!rows.length) return;
  for (const batch of chunk(rows, 500)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) {
      console.error(`Upsert failed for ${table}:`, error.message);
      throw error;
    }
  }
};

const migrateUsers = async () => {
  const snapshot = await firestore.collection('users').get();
  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    const createdAt = ensureTimestamp(data.createdAt);
    const updatedAt = ensureTimestamp(data.updatedAt, createdAt);
    return {
      id: doc.id,
      email: data.email || '',
      name: data.name || 'User',
      role: data.role || null,
      photo_url: data.photoURL || null,
      banner_url: data.bannerURL || null,
      country: data.country || null,
      profession: data.profession || null,
      skills: data.skills || [],
      resume_url: data.resumeURL || null,
      interview_readiness_score: data.interviewReadinessScore || null,
      subscription: data.subscription || 'free',
      credits: typeof data.credits === 'number' ? data.credits : 10,
      about: data.about || null,
      analytics: data.analytics || null,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  });

  await upsertRows('users', rows, 'id');
  console.log(`✅ Users migrated: ${rows.length}`);
};

const migrateBlogs = async () => {
  const snapshot = await firestore.collection('blogs').get();
  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    const createdAt = ensureTimestamp(data.createdAt);
    const updatedAt = ensureTimestamp(data.updatedAt, createdAt);
    return {
      id: doc.id,
      user_id: data.userId || data.authorId || null,
      author_name: data.authorName || null,
      author_avatar: data.authorAvatar || data.authorPhoto || null,
      title: data.title || null,
      content: data.content || null,
      image_url: data.imageURL || data.imageUrl || null,
      likes: data.likes || 0,
      comments_count: data.commentsCount || 0,
      type: data.type || 'blog',
      created_at: createdAt,
      updated_at: updatedAt,
    };
  });

  await upsertRows('blogs', rows, 'id');
  console.log(`✅ Blogs migrated: ${rows.length}`);
};

const migratePosts = async () => {
  const snapshot = await firestore.collection('posts').get();
  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    const createdAt = ensureTimestamp(data.createdAt);
    const updatedAt = ensureTimestamp(data.updatedAt, createdAt);
    return {
      id: doc.id,
      author_id: data.authorId || null,
      author_name: data.authorName || null,
      author_photo: data.authorPhoto || null,
      content: data.content || null,
      image_url: data.imageURL || data.imageUrl || null,
      likes: data.likes || 0,
      liked_by: data.likedBy || [],
      comments_count: data.commentsCount || 0,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  });

  await upsertRows('posts', rows, 'id');
  console.log(`✅ Posts migrated: ${rows.length}`);
};

const migrateComments = async () => {
  const snapshot = await firestore.collection('comments').get();
  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    const createdAt = ensureTimestamp(data.createdAt);
    return {
      id: doc.id,
      post_id: data.postId || null,
      author_id: data.authorId || null,
      author_name: data.authorName || null,
      author_photo: data.authorPhoto || null,
      content: data.content || null,
      created_at: createdAt,
    };
  });

  await upsertRows('comments', rows, 'id');
  console.log(`✅ Comments migrated: ${rows.length}`);
};

const parseSalary = (value) => {
  if (!value) return { salary_min: null, salary_max: null, salary_currency: null, salary_text: null };
  if (typeof value === 'string') return { salary_min: null, salary_max: null, salary_currency: null, salary_text: value };
  if (typeof value === 'object') {
    return {
      salary_min: value.min || null,
      salary_max: value.max || null,
      salary_currency: value.currency || null,
      salary_text: null,
    };
  }
  return { salary_min: null, salary_max: null, salary_currency: null, salary_text: null };
};

const migrateJobs = async () => {
  const snapshot = await firestore.collection('jobs').get();
  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    const salary = parseSalary(data.salary);
    const createdAt = ensureTimestamp(data.createdAt);
    const updatedAt = ensureTimestamp(data.updatedAt, createdAt);
    return {
      id: doc.id,
      title: data.title || '',
      company: data.company || '',
      description: data.description || null,
      location: data.location || null,
      salary_min: salary.salary_min,
      salary_max: salary.salary_max,
      salary_currency: salary.salary_currency,
      salary_text: salary.salary_text,
      type: data.type || null,
      requirements: data.requirements || [],
      skills: data.skills || [],
      tags: data.tags || [],
      posted_by: data.postedBy || null,
      applicants_count: data.applicantsCount || 0,
      apply_url: data.applyUrl || null,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  });

  await upsertRows('jobs', rows, 'id');
  console.log(`✅ Jobs migrated: ${rows.length}`);
};

const migrateApplicants = async () => {
  const jobsSnapshot = await firestore.collection('jobs').get();
  const rows = [];

  for (const jobDoc of jobsSnapshot.docs) {
    const applicantsSnapshot = await firestore
      .collection('jobs')
      .doc(jobDoc.id)
      .collection('applicants')
      .get();

    applicantsSnapshot.forEach((doc) => {
      const data = doc.data();
      rows.push({
        job_id: jobDoc.id,
        user_id: data.userId || doc.id,
        name: data.name || null,
        email: data.email || null,
        resume_url: data.resumeUrl || null,
        status: data.status || 'pending',
        applied_at: ensureTimestamp(data.appliedAt),
        notes: data.notes || null,
      });
    });
  }

  await upsertRows('job_applicants', rows, 'job_id,user_id');
  console.log(`✅ Job applicants migrated: ${rows.length}`);
};

const run = async () => {
  console.log('Starting migration...');
  await migrateUsers();
  await migrateBlogs();
  await migratePosts();
  await migrateComments();
  await migrateJobs();
  await migrateApplicants();
  console.log('Migration complete.');
};

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
