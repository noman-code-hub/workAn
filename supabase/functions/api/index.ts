// Supabase Edge Function: api
// Routes:
// - GET /api/health
// - GET /api/jobs/search

type JsonRecord = Record<string, unknown>;

const FIREBASE_PROJECT_ID = "workan-fb4ef";

const DEFAULT_ALLOWED_ORIGINS = new Set<string>([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5176",
  `https://${FIREBASE_PROJECT_ID}.web.app`,
  `https://${FIREBASE_PROJECT_ID}.firebaseapp.com`,
]);

const firebasePreviewRegex = new RegExp(
  `^https://${FIREBASE_PROJECT_ID}--[a-z0-9-]+\\.web\\.app$`,
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
  return DEFAULT_ALLOWED_ORIGINS.has(origin) || firebasePreviewRegex.test(origin);
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
  // Examples we normalize:
  // - /api/jobs/search
  // - /jobs/search
  // - /functions/v1/api/jobs/search (local dev)
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length >= 2 && parts[0] === "functions" && parts[1] === "v1") {
    parts.splice(0, 2);
  }

  // Drop function name prefix if present.
  if (parts[0] === "api") {
    parts.shift();
  }

  return `/${parts.join("/")}`;
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

      const params = new URLSearchParams({
        engine: "google_jobs",
        q: query,
        api_key: serpApiKey,
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
        const qualifications = Array.isArray(jobHighlights.Qualifications)
          ? jobHighlights.Qualifications
          : [];

        return {
          id: String(job.job_id || crypto.randomUUID()),
          title: String(job.title || "Untitled role"),
          company: String(job.company_name || "Unknown company"),
          location: String(job.location || "Unknown location"),
          description: String(job.description || "No description available"),
          salary,
          type: String(detected.schedule_type || "Full-time"),
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
