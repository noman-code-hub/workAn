const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const {createClient} = require("@supabase/supabase-js");

setGlobalOptions({maxInstances: 10});

const TMP_UPLOAD_DIR = path.join("/tmp", "hirevo-uploads");
if (!fs.existsSync(TMP_UPLOAD_DIR)) {
  fs.mkdirSync(TMP_UPLOAD_DIR, {recursive: true});
}

const app = express();
const upload = multer({dest: TMP_UPLOAD_DIR});

app.use(cors({origin: true, credentials: true}));
app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({extended: true}));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

const parseRelativeDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString();

  const now = new Date();
  const text = String(dateStr).toLowerCase();

  try {
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
      const days = parseInt(dayMatch[1], 10);
      now.setDate(now.getDate() - days);
      return now.toISOString();
    }

    const monthMatch = text.match(/(\d+)\s+month/);
    if (monthMatch) {
      const months = parseInt(monthMatch[1], 10);
      now.setMonth(now.getMonth() - months);
      return now.toISOString();
    }

    return now.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
};

const parseSalary = (salaryStr) => {
  if (!salaryStr) return {min: 0, max: 0, currency: "USD"};

  const str = String(salaryStr).toUpperCase().replace(/,/g, "");
  let min = 0;
  let max = 0;

  const matches = str.match(/(\d+(?:\.\d+)?)\s*K?/g);
  if (matches) {
    const numbers = matches.map((match) => {
      let value = parseFloat(match.replace("K", ""));
      if (match.includes("K")) value *= 1000;
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

  return {min, max, currency: "USD"};
};

const cleanUpTempFile = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    logger.warn(`Failed to delete temp file ${filePath}: ${error.message}`);
  }
};

const slugify = (value) => {
  return value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "template";
};

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

app.get(["/health", "/api/health"], (req, res) => {
  res.json({
    status: "ok",
    message: "Firebase API function is running",
    timestamp: new Date().toISOString(),
  });
});

app.get(["/api/jobs/search", "/jobs/search"], async (req, res) => {
  try {
    const serpApiKey = process.env.SERPAPI_KEY;
    if (!serpApiKey) {
      return res.status(500).json({
        success: false,
        error: "Server configuration error",
        message: "SERPAPI_KEY is missing",
      });
    }

    const {query, location, page_token} = req.query;
    const params = {
      engine: "google_jobs",
      q: String(query || "dev").trim(),
      api_key: serpApiKey,
    };

    if (location) {
      params.location = location;
    }

    if (page_token && page_token !== "null" && page_token !== "undefined") {
      params.next_page_token = page_token;
    }

    const response = await axios.get("https://serpapi.com/search.json", {
      params,
      timeout: 25000,
    });

    if (response.data.error) {
      const serpMessage = String(response.data.error);
      const lowerMessage = serpMessage.toLowerCase();
      const isInvalidKey =
        lowerMessage.includes("invalid api key") ||
        lowerMessage.includes("api key should be here");

      return res.status(isInvalidKey ? 502 : 500).json({
        success: false,
        error: isInvalidKey ? "SERPAPI_INVALID_KEY" : "SERPAPI_UPSTREAM_ERROR",
        message: isInvalidKey ?
          "Invalid SerpAPI key configured on backend. Update SERPAPI_KEY in function secrets." :
          serpMessage,
      });
    }

    const jobsResults = response.data.jobs_results || [];
    const transformedJobs = jobsResults.map((job) => {
      const salaryRaw = job.detected_extensions?.salary || null;
      const postedRaw = job.detected_extensions?.posted_at || null;

      return {
        id: job.job_id || Math.random().toString(36).slice(2),
        title: job.title,
        company: job.company_name,
        location: job.location,
        description: job.description || "No description available",
        salary: parseSalary(salaryRaw),
        type: job.detected_extensions?.schedule_type || "Full-time",
        postedDate: parseRelativeDate(postedRaw),
        redirect_url: job.apply_options?.[0]?.link || "#",
        applyUrl: job.apply_options?.[0]?.link || "#",
        skills: job.job_highlights?.Qualifications || [],
        requirements: job.job_highlights?.Qualifications || [],
        tags: job.detected_extensions ? Object.keys(job.detected_extensions) : [],
        logoUrl: job.thumbnail || null,
      };
    });

    const nextToken = response.data.serpapi_pagination?.next_page_token || null;
    return res.json({
      success: true,
      count: nextToken ? 1000 : jobsResults.length,
      results: transformedJobs,
      next_page_token: nextToken,
    });
  } catch (error) {
    logger.error("Error fetching jobs", {message: error.message});
    return res.status(500).json({
      success: false,
      error: "Failed to fetch jobs",
      message: error.response?.data?.error || error.message,
    });
  }
});

app.get(["/api/templates", "/templates"], async (req, res) => {
  if (!supabase) {
    logger.warn("Supabase credentials missing. Returning empty templates list.");
    return res.json([]);
  }

  try {
    const {data, error} = await supabase
        .from("resume_templates")
        .select("*")
        .order("created_at", {ascending: false});

    if (error) throw error;
    return res.json(data || []);
  } catch (error) {
    if (error.code === "PGRST205" || String(error.message).includes("resume_templates")) {
      logger.warn("resume_templates table missing. Returning empty list.");
      return res.json([]);
    }

    logger.error("Failed to fetch templates", {message: error.message});
    return res.status(500).json({
      error: "Failed to fetch templates",
      details: error.message,
    });
  }
});

app.post(
    ["/api/templates/upload", "/templates/upload"],
    upload.fields([
      {name: "html", maxCount: 1},
      {name: "css", maxCount: 1},
      {name: "js", maxCount: 1},
      {name: "thumbnail", maxCount: 1},
    ]),
    async (req, res) => {
      const htmlFile = req.files?.html?.[0];
      const cssFile = req.files?.css?.[0];
      const jsFile = req.files?.js?.[0];
      const thumbnailFile = req.files?.thumbnail?.[0];

      if (!supabase) {
        [htmlFile, cssFile, jsFile, thumbnailFile].forEach((file) => cleanUpTempFile(file?.path));
        return res.status(500).json({
          error: "Supabase not configured",
          details: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
        });
      }

      const uploadToSupabase = async (bucket, folder, file, contentType, fileNameOverride) => {
        const safeFolder = String(folder || "").replace(/^\/+|\/+$/g, "");
        const fileName = fileNameOverride || file.originalname;
        const storagePath = safeFolder ? `${safeFolder}/${fileName}` : fileName;
        const fileContent = fs.readFileSync(file.path);

        const {error} = await supabase.storage
            .from(bucket)
            .upload(storagePath, fileContent, {contentType, upsert: true});

        if (error) throw error;
        const {data: publicData} = supabase.storage.from(bucket).getPublicUrl(storagePath);
        cleanUpTempFile(file.path);
        return publicData.publicUrl;
      };

      try {
        const name = req.body?.name || "";
        const baseName = name.trim() ?
          slugify(name) :
          (htmlFile?.originalname ?
          slugify(htmlFile.originalname.replace(/\.[^.]+$/, "")) :
          `template_${Date.now()}`);

        let htmlUrl = null;
        let cssUrl = null;
        let jsUrl = null;
        let thumbnailUrl = null;

        if (htmlFile) {
          htmlUrl = await uploadToSupabase(
              "resume_templates",
              "",
              htmlFile,
              "text/html",
              `${baseName}.html`,
          );
        }

        if (cssFile) {
          cssUrl = await uploadToSupabase(
              "resume_templates",
              "",
              cssFile,
              "text/css",
              `${baseName}.css`,
          );
        }

        if (jsFile) {
          jsUrl = await uploadToSupabase(
              "resume_templates",
              "",
              jsFile,
              "application/javascript",
              `${baseName}.js`,
          );
        }

        if (thumbnailFile) {
          const thumbExt = (thumbnailFile.originalname.match(/\.[^.]+$/) || [".png"])[0].toLowerCase();
          thumbnailUrl = await uploadToSupabase(
              "resume_templates",
              "thumbnails",
              thumbnailFile,
              thumbnailFile.mimetype || "image/png",
              `${baseName}${thumbExt}`,
          );
        }

        const payload = {
          name: name || baseName,
          html_url: htmlUrl,
          css_url: cssUrl,
          js_url: jsUrl,
          thumbnail_url: thumbnailUrl,
        };

        const {data, error} = await supabase.from("resume_templates").insert([payload]).select();
        if (error) throw error;

        return res.json({success: true, template: data?.[0] || null});
      } catch (error) {
        logger.error("Template upload failed", {message: error.message});
        [htmlFile, cssFile, jsFile, thumbnailFile].forEach((file) => cleanUpTempFile(file?.path));
        return res.status(500).json({
          error: "Failed to upload template",
          details: error.message,
        });
      }
    },
);

app.post(["/api/upload-resume", "/upload-resume"], upload.single("resume"), async (req, res) => {
  let filePath = "";
  let createdTempFile = false;

  try {
    if (req.file?.path) {
      filePath = req.file.path;
      createdTempFile = true;
    } else if (req.body?.resumeUrl) {
      const sourceUrl = req.body.resumeUrl;
      const download = await axios.get(sourceUrl, {
        responseType: "arraybuffer",
        timeout: 25000,
      });

      filePath = path.join(TMP_UPLOAD_DIR, `resume_${Date.now()}`);
      fs.writeFileSync(filePath, download.data);
      createdTempFile = true;
    } else {
      return res.status(400).json({error: "No resume file or URL provided"});
    }

    const matcherUrl = process.env.RESUME_MATCHER_URL || "http://localhost:8000";
    const formData = new FormData();
    formData.append("resume", fs.createReadStream(filePath));
    if (req.body?.jobDescription) {
      formData.append("job_description", req.body.jobDescription);
    }

    const response = await axios.post(`${matcherUrl}/api/v1/match`, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 120000,
    });

    const {
      score,
      keywords_matched,
      missing_skills,
      summary,
      resume_metadata,
    } = response.data || {};

    return res.json({
      success: true,
      score,
      keywords_matched,
      missing_skills,
      summary,
      resume_metadata,
    });
  } catch (error) {
    logger.error("Resume upload failed", {message: error.message});
    return res.status(500).json({
      error: "Failed to analyze resume",
      details: error.response?.data || error.message,
    });
  } finally {
    if (createdTempFile) cleanUpTempFile(filePath);
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

app.use((err, req, res, next) => {
  logger.error("Unhandled function error", {message: err.message});
  if (typeof next === "function") {
    // No-op: keep Express error middleware signature.
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

exports.api = onRequest({
  timeoutSeconds: 120,
  memory: "1GiB",
}, app);
