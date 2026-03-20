// Supabase Edge Function: api
// Routes:
// - GET /api/health
// - GET /api/jobs/search
// - GET /api/jobs/market
// - POST /api/jobs/market/sync
// - GET /api/jobs/market/roles

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;

type JobType = "full-time" | "part-time" | "contract" | "remote";

type MarketJobRow = {
  external_id: string;
  country: string;
  source: string;
  role_query: string;
  title: string;
  company: string;
  location: string;
  description: string;
  job_type: JobType;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  skills: string[];
  requirements: string[];
  tags: string[];
  apply_url: string;
  redirect_url: string;
  logo_url: string | null;
  posted_at: string;
  last_seen_at: string;
  raw_payload: JsonRecord;
  updated_at: string;
};

type MarketDbRow = {
  external_id: string;
  country: string;
  role_query: string;
  title: string;
  company: string;
  location: string;
  description: string;
  job_type: JobType;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  skills: string[];
  requirements: string[];
  tags: string[];
  apply_url: string;
  redirect_url: string;
  logo_url: string | null;
  posted_at: string;
  updated_at: string;
};

type SyncSummary = {
  syncedAt: string;
  totalQueries: number;
  successfulQueries: number;
  failedQueries: string[];
  activeJobs: number;
  removedJobs: number;
};

const FIREBASE_PROJECT_ID = "workan-fb4ef";
const VERCEL_PROJECT_SLUG = "workan";
const WEEKLY_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_MARKET_COUNTRY = "us";
const DEFAULT_MARKET_LIMIT = 60;
const MAX_MARKET_LIMIT = 200;

const MARKET_ROLE_QUERIES = [
  "Manager",
  "Assistant Manager",
  "Supervisor",
  "HR Officer",
  "Accountant",
  "Finance Analyst",
  "Data Entry Operator",
  "Receptionist",
  "Admin Officer",
  "Executive Assistant",
  "Software Developer",
  "Web Developer",
  "Mobile App Developer",
  "UI/UX Designer",
  "Graphic Designer",
  "Data Analyst",
  "Cybersecurity Specialist",
  "Network Engineer",
  "IT Support Officer",
  "Product Manager",
  "Mechanical Engineer",
  "Electrical Engineer",
  "Civil Engineer",
  "Quality Control Officer",
  "Technician",
  "Machine Operator",
  "CAD Designer",
  "Maintenance Engineer",
  "Doctor",
  "Nurse",
  "Pharmacist",
  "Lab Technician",
  "Medical Assistant",
  "Dentist",
  "Physiotherapist",
  "Radiologist",
  "Teacher",
  "Lecturer",
  "Principal",
  "Tutor",
  "Academic Coordinator",
  "Librarian",
  "Sales Executive",
  "Marketing Manager",
  "Social Media Manager",
  "Brand Ambassador",
  "Customer Service Representative",
  "Call Center Agent",
  "Site Supervisor",
  "Mason",
  "Plumber",
  "Electrician",
  "Carpenter",
  "Painter",
  "Laborer",
  "Driver",
  "Delivery Rider",
  "Warehouse Manager",
  "Storekeeper",
  "Logistics Coordinator",
  "Photographer",
  "Video Editor",
  "Content Creator",
  "Copywriter",
  "Animator",
  "Actor",
  "Director",
];

const DEFAULT_ALLOWED_ORIGINS = new Set<string>([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5176",
  "https://workshour.com",
  "https://www.workshour.com",
  `https://${FIREBASE_PROJECT_ID}.web.app`,
  `https://${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  `https://${VERCEL_PROJECT_SLUG}.vercel.app`,
]);

const firebasePreviewRegex = new RegExp(
  `^https://${FIREBASE_PROJECT_ID}--[a-z0-9-]+\\.web\\.app$`,
  "i",
);
const vercelPreviewRegex = new RegExp(
  `^https://${VERCEL_PROJECT_SLUG}-[a-z0-9-]+\\.vercel\\.app$`,
  "i",
);

const extraAllowedOrigins = (Deno.env.get("CORS_ORIGINS") || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

for (const origin of extraAllowedOrigins) {
  DEFAULT_ALLOWED_ORIGINS.add(origin);
}

const isAllowedOrigin = (origin: string): boolean => {
  return (
    DEFAULT_ALLOWED_ORIGINS.has(origin) ||
    firebasePreviewRegex.test(origin) ||
    vercelPreviewRegex.test(origin)
  );
};

const corsHeaders = (origin: string | null): Headers => {
  const headers = new Headers();
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Content-Type", "application/json");
  return headers;
};

const json = (data: JsonRecord, status = 200, origin: string | null = null): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin),
  });
};

const normalizePath = (pathname: string): string => {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length >= 2 && parts[0] === "functions" && parts[1] === "v1") {
    parts.splice(0, 2);
  }

  if (parts[0] === "api") {
    parts.shift();
  }

  return `/${parts.join("/")}`;
};

const normalizeCountry = (value: string | null): string => {
  const raw = (value || DEFAULT_MARKET_COUNTRY).trim().toLowerCase();
  return /^[a-z]{2}$/.test(raw) ? raw : DEFAULT_MARKET_COUNTRY;
};

const parseBoolean = (value: string | null): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const parseRelativeDate = (dateStr: string | null): string => {
  if (!dateStr) return new Date().toISOString();

  const now = new Date();
  const text = dateStr.toLowerCase();

  if (
    text.includes("hour") ||
    text.includes("minute") ||
    text.includes("second") ||
    text.includes("just now")
  ) {
    return now.toISOString();
  }

  const dayMatch = text.match(/(\d+)\s+day/);
  if (dayMatch) {
    const days = Number.parseInt(dayMatch[1], 10);
    now.setDate(now.getDate() - days);
    return now.toISOString();
  }

  const monthMatch = text.match(/(\d+)\s+month/);
  if (monthMatch) {
    const months = Number.parseInt(monthMatch[1], 10);
    now.setMonth(now.getMonth() - months);
    return now.toISOString();
  }

  return now.toISOString();
};

const parseSalary = (salaryStr: string | null): { min: number; max: number; currency: string } => {
  if (!salaryStr) return { min: 0, max: 0, currency: "USD" };

  const str = salaryStr.toUpperCase().replaceAll(",", "");
  let min = 0;
  let max = 0;

  const matches = str.match(/(\d+(?:\.\d+)?)\s*K?/g);
  if (matches) {
    const numbers = matches.map((raw) => {
      let value = Number.parseFloat(raw.replace("K", ""));
      if (raw.includes("K")) value *= 1000;
      return value;
    });

    if (numbers.length >= 2) {
      min = numbers[0];
      max = numbers[1];
    } else if (numbers.length === 1) {
      min = numbers[0];
      max = numbers[0];
    }
  }

  if (str.includes("HOUR") || (min > 0 && min < 200)) {
    min *= 2080;
    max *= 2080;
  }

  if (str.includes("MONTH")) {
    min *= 12;
    max *= 12;
  }

  return { min, max, currency: "USD" };
};

const normalizeJobType = (rawType: string | null): JobType => {
  const value = (rawType || "").toLowerCase();
  if (value.includes("part")) return "part-time";
  if (value.includes("contract")) return "contract";
  if (value.includes("remote")) return "remote";
  return "full-time";
};

const normalizeText = (value: unknown): string => {
  return String(value || "").trim();
};

const sanitizeSearchTerm = (value: string): string => {
  return value.replaceAll(",", " ").replaceAll("%", "").trim();
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

const buildExternalId = (job: Record<string, unknown>): string => {
  const rawId = normalizeText(job.job_id);
  if (rawId) return `serpapi:${rawId}`;

  const fallback = [
    normalizeText(job.title),
    normalizeText(job.company_name),
    normalizeText(job.location),
  ]
    .join("|")
    .toLowerCase()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^a-z0-9|_-]/g, "");

  return `serpapi:fallback:${fallback || crypto.randomUUID()}`;
};

const getAdminClient = (() => {
  let cached: SupabaseClient | null = null;
  let attempted = false;

  return (): SupabaseClient | null => {
    if (attempted) return cached;
    attempted = true;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) {
      cached = null;
      return cached;
    }

    cached = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    return cached;
  };
})();

const fetchSerpJobs = async (
  serpApiKey: string,
  query: string,
  country: string,
  pageToken: string | null = null,
): Promise<{ jobs: MarketJobRow[]; nextToken: string | null }> => {
  const params = new URLSearchParams({
    engine: "google_jobs",
    q: query,
    api_key: serpApiKey,
    gl: country,
    hl: "en",
  });

  if (pageToken) {
    params.set("next_page_token", pageToken);
  }

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`SerpAPI request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data?.error) {
    throw new Error(String(data.error));
  }

  const jobsResults: Array<Record<string, unknown>> = Array.isArray(data?.jobs_results)
    ? data.jobs_results
    : [];
  const syncTimestamp = new Date().toISOString();

  const jobs: MarketJobRow[] = jobsResults.map((job) => {
    const detected = (job.detected_extensions || {}) as Record<string, unknown>;
    const highlights = (job.job_highlights || {}) as Record<string, unknown>;
    const applyOptions = Array.isArray(job.apply_options) ? job.apply_options : [];
    const firstApply = (applyOptions[0] || {}) as Record<string, unknown>;

    const salary = parseSalary((detected.salary as string | undefined) || null);
    const postedAt = parseRelativeDate((detected.posted_at as string | undefined) || null);
    const qualifications = toStringArray(highlights.Qualifications);
    const externalId = buildExternalId(job);

    return {
      external_id: externalId,
      country,
      source: "serpapi",
      role_query: query,
      title: normalizeText(job.title) || "Untitled role",
      company: normalizeText(job.company_name) || "Unknown company",
      location: normalizeText(job.location) || "Unknown location",
      description: normalizeText(job.description) || "No description available",
      job_type: normalizeJobType(normalizeText(detected.schedule_type)),
      salary_min: salary.min,
      salary_max: salary.max,
      salary_currency: salary.currency,
      skills: qualifications,
      requirements: qualifications,
      tags: Object.keys(detected),
      apply_url: normalizeText(firstApply.link) || "#",
      redirect_url: normalizeText(firstApply.link) || "#",
      logo_url: job.thumbnail ? normalizeText(job.thumbnail) : null,
      posted_at: postedAt,
      last_seen_at: syncTimestamp,
      raw_payload: job,
      updated_at: syncTimestamp,
    };
  });

  const nextToken = data?.serpapi_pagination?.next_page_token
    ? String(data.serpapi_pagination.next_page_token)
    : null;

  return { jobs, nextToken };
};

const getMarketSyncState = async (
  supabase: SupabaseClient,
  country: string,
): Promise<{ last_synced_at: string | null } | null> => {
  const { data, error } = await supabase
    .from("market_job_sync_state")
    .select("last_synced_at")
    .eq("country", country)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
};

const syncMarketJobs = async (country: string): Promise<SyncSummary> => {
  const supabase = getAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }

  const serpApiKey = Deno.env.get("SERPAPI_KEY");
  if (!serpApiKey) {
    throw new Error("SERPAPI_KEY is missing.");
  }

  const maxRolesFromEnv = Number.parseInt(
    Deno.env.get("MARKET_SYNC_MAX_ROLES") || String(MARKET_ROLE_QUERIES.length),
    10,
  );
  const maxRoles = Number.isFinite(maxRolesFromEnv)
    ? Math.max(1, Math.min(maxRolesFromEnv, MARKET_ROLE_QUERIES.length))
    : MARKET_ROLE_QUERIES.length;

  const selectedQueries = MARKET_ROLE_QUERIES.slice(0, maxRoles);
  const syncStartedAt = new Date().toISOString();
  const failedQueries: string[] = [];
  const dedupedJobs = new Map<string, MarketJobRow>();

  for (const roleQuery of selectedQueries) {
    try {
      const { jobs } = await fetchSerpJobs(serpApiKey, roleQuery, country);
      for (const job of jobs) {
        const key = `${country}:${job.external_id}`;
        const existing = dedupedJobs.get(key);
        if (!existing) {
          dedupedJobs.set(key, { ...job, last_seen_at: syncStartedAt, updated_at: syncStartedAt });
          continue;
        }

        const existingPostedAt = new Date(existing.posted_at).getTime();
        const incomingPostedAt = new Date(job.posted_at).getTime();
        if (incomingPostedAt > existingPostedAt) {
          dedupedJobs.set(key, { ...job, last_seen_at: syncStartedAt, updated_at: syncStartedAt });
        }
      }
    } catch (_error) {
      failedQueries.push(roleQuery);
    }
  }

  const upsertRows = Array.from(dedupedJobs.values());
  if (upsertRows.length > 0) {
    const { error: upsertError } = await supabase
      .from("market_jobs")
      .upsert(upsertRows, { onConflict: "external_id,country" });

    if (upsertError) {
      throw upsertError;
    }
  }

  let removedJobs = 0;
  if (upsertRows.length > 0) {
    const { data: removed, error: removeError } = await supabase
      .from("market_jobs")
      .delete()
      .eq("source", "serpapi")
      .eq("country", country)
      .lt("last_seen_at", syncStartedAt)
      .select("external_id");

    if (removeError) {
      throw removeError;
    }
    removedJobs = removed?.length ?? 0;
  }

  const summary: SyncSummary = {
    syncedAt: syncStartedAt,
    totalQueries: selectedQueries.length,
    successfulQueries: selectedQueries.length - failedQueries.length,
    failedQueries,
    activeJobs: upsertRows.length,
    removedJobs,
  };

  const { error: syncStateError } = await supabase
    .from("market_job_sync_state")
    .upsert(
      {
        country,
        last_synced_at: summary.syncedAt,
        total_queries: summary.totalQueries,
        successful_queries: summary.successfulQueries,
        failed_queries: summary.failedQueries,
        active_jobs: summary.activeJobs,
        removed_jobs: summary.removedJobs,
        updated_at: summary.syncedAt,
      },
      { onConflict: "country" },
    );

  if (syncStateError) {
    throw syncStateError;
  }

  return summary;
};

const listMarketJobs = async (
  supabase: SupabaseClient,
  country: string,
  role: string,
  search: string,
  limit: number,
): Promise<{ rows: MarketDbRow[]; total: number }> => {
  let countQuery = supabase
    .from("market_jobs")
    .select("external_id", { count: "exact", head: true })
    .eq("country", country)
    .eq("source", "serpapi");

  let rowsQuery = supabase
    .from("market_jobs")
    .select(
      "external_id,country,role_query,title,company,location,description,job_type,salary_min,salary_max,salary_currency,skills,requirements,tags,apply_url,redirect_url,logo_url,posted_at,updated_at",
    )
    .eq("country", country)
    .eq("source", "serpapi");

  if (role) {
    countQuery = countQuery.eq("role_query", role);
    rowsQuery = rowsQuery.eq("role_query", role);
  }

  if (search) {
    const term = sanitizeSearchTerm(search);
    if (term) {
      const expr = `title.ilike.%${term}%,company.ilike.%${term}%,location.ilike.%${term}%`;
      countQuery = countQuery.or(expr);
      rowsQuery = rowsQuery.or(expr);
    }
  }

  rowsQuery = rowsQuery
    .order("posted_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  const [{ count, error: countError }, { data, error: rowsError }] = await Promise.all([
    countQuery,
    rowsQuery,
  ]);

  if (countError) {
    throw countError;
  }
  if (rowsError) {
    throw rowsError;
  }

  return {
    rows: (data || []) as MarketDbRow[],
    total: count ?? data?.length ?? 0,
  };
};

const marketDbRowsToJobs = (rows: MarketDbRow[]) => {
  return rows.map((row) => ({
    id: row.external_id,
    title: row.title,
    company: row.company,
    location: row.location,
    type: row.job_type,
    salary: {
      min: Number(row.salary_min || 0),
      max: Number(row.salary_max || 0),
      currency: row.salary_currency || "USD",
    },
    description: row.description || "No description available",
    requirements: Array.isArray(row.requirements) ? row.requirements : [],
    skills: Array.isArray(row.skills) ? row.skills : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    postedDate: row.posted_at || row.updated_at || new Date().toISOString(),
    applyUrl: row.apply_url || row.redirect_url || "#",
    redirect_url: row.redirect_url || row.apply_url || "#",
    logoUrl: row.logo_url || null,
    sourceQuery: row.role_query,
    country: row.country,
  }));
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const path = normalizePath(new URL(req.url).pathname);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  if (req.method === "GET" && path === "/health") {
    return json(
      {
        status: "ok",
        message: "Supabase Edge API is running",
        timestamp: new Date().toISOString(),
      },
      200,
      origin,
    );
  }

  if (req.method === "GET" && path === "/jobs/market/roles") {
    return json(
      {
        success: true,
        count: MARKET_ROLE_QUERIES.length,
        roles: MARKET_ROLE_QUERIES,
      },
      200,
      origin,
    );
  }

  if (req.method === "POST" && path === "/jobs/market/sync") {
    try {
      const syncToken = Deno.env.get("JOB_SYNC_TOKEN") || "";
      if (syncToken) {
        const auth = req.headers.get("authorization") || "";
        const bearer = auth.toLowerCase().startsWith("bearer ")
          ? auth.slice(7).trim()
          : "";
        if (!bearer || bearer !== syncToken) {
          return json(
            {
              success: false,
              error: "Unauthorized",
              message: "Missing or invalid sync token.",
            },
            401,
            origin,
          );
        }
      }

      const payload = await req.json().catch(() => ({} as JsonRecord));
      const bodyCountry = typeof payload?.country === "string" ? payload.country : null;
      const country = normalizeCountry(bodyCountry);

      const syncSummary = await syncMarketJobs(country);

      return json(
        {
          success: true,
          message: "Market jobs synced successfully.",
          country,
          sync: syncSummary,
        },
        200,
        origin,
      );
    } catch (error) {
      return json(
        {
          success: false,
          error: "Market sync failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500,
        origin,
      );
    }
  }

  if (req.method === "GET" && path === "/jobs/market") {
    try {
      const supabase = getAdminClient();
      if (!supabase) {
        return json(
          {
            success: false,
            error: "Configuration error",
            message: "SUPABASE_SERVICE_ROLE_KEY is missing for market jobs endpoint.",
          },
          500,
          origin,
        );
      }

      const url = new URL(req.url);
      const country = normalizeCountry(url.searchParams.get("country"));
      const role = normalizeText(url.searchParams.get("role"));
      const search = normalizeText(url.searchParams.get("q"));
      const forceSync = parseBoolean(url.searchParams.get("force_sync"));

      const requestedLimit = Number.parseInt(
        url.searchParams.get("limit") || String(DEFAULT_MARKET_LIMIT),
        10,
      );
      const limit = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(requestedLimit, MAX_MARKET_LIMIT))
        : DEFAULT_MARKET_LIMIT;

      let syncState = await getMarketSyncState(supabase, country);
      let shouldSync = true;
      if (syncState?.last_synced_at) {
        const lastSynced = new Date(syncState.last_synced_at).getTime();
        shouldSync = Number.isFinite(lastSynced) ? (Date.now() - lastSynced) >= WEEKLY_REFRESH_MS : true;
      }

      let syncSummary: SyncSummary | null = null;
      let syncError: string | null = null;
      if (forceSync || shouldSync) {
        try {
          syncSummary = await syncMarketJobs(country);
          syncState = { last_synced_at: syncSummary.syncedAt };
        } catch (error) {
          syncError = error instanceof Error ? error.message : "Unknown sync error";
        }
      }

      let { rows, total } = await listMarketJobs(supabase, country, role, search, limit);

      // Recover automatically when sync state exists but the market jobs cache is empty.
      if (!forceSync && total === 0) {
        const globalCache = await listMarketJobs(supabase, country, "", "", 1);
        if (globalCache.total === 0) {
          try {
            syncSummary = await syncMarketJobs(country);
            syncState = { last_synced_at: syncSummary.syncedAt };
            syncError = null;
            const refreshed = await listMarketJobs(supabase, country, role, search, limit);
            rows = refreshed.rows;
            total = refreshed.total;
          } catch (error) {
            syncError = error instanceof Error ? error.message : "Unknown sync error";
          }
        }
      }

      return json(
        {
          success: true,
          source: "database",
          country,
          count: total,
          results: marketDbRowsToJobs(rows),
          synced: Boolean(syncSummary),
          sync: syncSummary,
          sync_error: syncError,
          updated_at: syncSummary?.syncedAt || syncState?.last_synced_at || null,
        },
        200,
        origin,
      );
    } catch (error) {
      return json(
        {
          success: false,
          error: "Failed to load market jobs",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500,
        origin,
      );
    }
  }

  if (req.method === "GET" && path === "/jobs/search") {
    try {
      const serpApiKey = Deno.env.get("SERPAPI_KEY");
      if (!serpApiKey) {
        return json(
          {
            success: false,
            error: "Server configuration error",
            message: "SERPAPI_KEY is missing",
          },
          500,
          origin,
        );
      }

      const url = new URL(req.url);
      const query = (url.searchParams.get("query") || "dev").trim();
      const location = url.searchParams.get("location");
      const pageToken = url.searchParams.get("page_token");
      const country = normalizeCountry(url.searchParams.get("country"));

      const params = new URLSearchParams({
        engine: "google_jobs",
        q: query,
        api_key: serpApiKey,
        gl: country,
      });

      if (location) params.set("location", location);
      if (pageToken && pageToken !== "null" && pageToken !== "undefined") {
        params.set("next_page_token", pageToken);
      }

      const serpRes = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
      const serpData = await serpRes.json();

      if (serpData?.error) {
        const serpMessage = String(serpData.error);
        const lowerMessage = serpMessage.toLowerCase();
        const isInvalidKey =
          lowerMessage.includes("invalid api key") ||
          lowerMessage.includes("api key should be here");

        return json(
          {
            success: false,
            error: isInvalidKey ? "SERPAPI_INVALID_KEY" : "SERPAPI_UPSTREAM_ERROR",
            message: isInvalidKey
              ? "Invalid SerpAPI key configured on backend. Update SERPAPI_KEY in Supabase Edge Function secrets."
              : serpMessage,
          },
          isInvalidKey ? 502 : 500,
          origin,
        );
      }

      const jobsResults: Array<Record<string, unknown>> = Array.isArray(serpData?.jobs_results)
        ? serpData.jobs_results
        : [];

      const transformedJobs = jobsResults.map((job) => {
        const detected = (job.detected_extensions || {}) as Record<string, unknown>;
        const jobHighlights = (job.job_highlights || {}) as Record<string, unknown>;
        const applyOptions = Array.isArray(job.apply_options) ? job.apply_options : [];
        const firstApply = (applyOptions[0] || {}) as Record<string, unknown>;

        const salary = parseSalary((detected.salary as string | undefined) || null);
        const postedDate = parseRelativeDate((detected.posted_at as string | undefined) || null);
        const qualifications = toStringArray(jobHighlights.Qualifications);

        return {
          id: String(job.job_id || crypto.randomUUID()),
          title: String(job.title || "Untitled role"),
          company: String(job.company_name || "Unknown company"),
          location: String(job.location || "Unknown location"),
          description: String(job.description || "No description available"),
          salary,
          type: normalizeJobType(String(detected.schedule_type || "Full-time")),
          postedDate,
          redirect_url: String(firstApply.link || "#"),
          applyUrl: String(firstApply.link || "#"),
          skills: qualifications,
          requirements: qualifications,
          tags: Object.keys(detected),
          logoUrl: job.thumbnail ? String(job.thumbnail) : null,
        };
      });

      const nextToken = serpData?.serpapi_pagination?.next_page_token || null;

      return json(
        {
          success: true,
          count: nextToken ? 1000 : transformedJobs.length,
          results: transformedJobs,
          next_page_token: nextToken,
        },
        200,
        origin,
      );
    } catch (error) {
      return json(
        {
          success: false,
          error: "Failed to fetch jobs",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500,
        origin,
      );
    }
  }

  return json(
    {
      success: false,
      error: "Not Found",
      message: `Route ${req.method} ${path} not found`,
    },
    404,
    origin,
  );
});
