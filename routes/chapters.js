const express = require("express");
const multer = require("multer");
const {
  getAllChapters,
  getChapterById,
  createChapters,
  updateChapter,
  deleteChapter,
  getStatistics,
} = require("../controllers/chapterController");
const { adminAuth } = require("../middleware/auth");
const { adminRateLimiter } = require("../middleware/rateLimiter");
const { cacheMiddleware } = require("../middleware/cache");
const {
  validateChaptersArray,
  validateQueryParams,
  validateChapter,
} = require("../validators/chapterValidator");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/json" ||
      file.originalname.endsWith(".json")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only JSON files are allowed"), false);
    }
  },
});

// Public routes (with caching)
router.get(
  "/",
  validateQueryParams,
  cacheMiddleware(3600), // Cache for 1 hour
  getAllChapters
);

router.get(
  "/stats",
  cacheMiddleware(1800), // Cache for 30 minutes
  getStatistics
);

router.get(
  "/:id",
  cacheMiddleware(3600), // Cache for 1 hour
  getChapterById
);

// Admin routes (require authentication and higher rate limits)
router.post(
  "/",
  adminRateLimiter,
  adminAuth,
  upload.single("chapters"),
  validateChaptersArray,
  createChapters
);

router.put("/:id", adminRateLimiter, adminAuth, validateChapter, updateChapter);

router.patch("/:id", adminRateLimiter, adminAuth, updateChapter);

router.delete("/:id", adminRateLimiter, adminAuth, deleteChapter);

module.exports = router;
