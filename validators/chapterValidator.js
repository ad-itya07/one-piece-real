const Joi = require("joi");

// Year-wise question count schema
const yearWiseQuestionCountSchema = Joi.object({
  2019: Joi.number().integer().min(0).default(0),
  2020: Joi.number().integer().min(0).default(0),
  2021: Joi.number().integer().min(0).default(0),
  2022: Joi.number().integer().min(0).default(0),
  2023: Joi.number().integer().min(0).default(0),
  2024: Joi.number().integer().min(0).default(0),
  2025: Joi.number().integer().min(0).default(0),
}).required();

// Single chapter validation schema
const chapterSchema = Joi.object({
  subject: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Subject cannot be empty",
    "string.max": "Subject cannot exceed 100 characters",
    "any.required": "Subject is required",
  }),

  chapter: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Chapter name cannot be empty",
    "string.max": "Chapter name cannot exceed 200 characters",
    "any.required": "Chapter name is required",
  }),

  class: Joi.string().trim().min(1).max(50).required().messages({
    "string.empty": "Class cannot be empty",
    "string.max": "Class cannot exceed 50 characters",
    "any.required": "Class is required",
  }),

  unit: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Unit cannot be empty",
    "string.max": "Unit cannot exceed 100 characters",
    "any.required": "Unit is required",
  }),

  yearWiseQuestionCount: yearWiseQuestionCountSchema,

  questionSolved: Joi.number().integer().min(0).required().messages({
    "number.min": "Questions solved cannot be negative",
    "any.required": "Questions solved is required",
  }),

  status: Joi.string()
    .valid("Not Started", "In Progress", "Completed", "Revision")
    .required()
    .messages({
      "any.only":
        "Status must be one of: Not Started, In Progress, Completed, Revision",
      "any.required": "Status is required",
    }),

  isWeakChapter: Joi.boolean().required().messages({
    "any.required": "isWeakChapter is required",
  }),
});

// Array of chapters validation schema
const chaptersArraySchema = Joi.array()
  .items(chapterSchema)
  .min(1)
  .required()
  .messages({
    "array.min": "At least one chapter is required",
    "any.required": "Chapters array is required",
  });

// Query parameters validation for GET endpoints
const queryParamsSchema = Joi.object({
  class: Joi.string().trim().optional(),
  unit: Joi.string().trim().optional(),
  status: Joi.string()
    .valid("Not Started", "In Progress", "Completed", "Revision")
    .optional(),
  weakChapters: Joi.boolean().optional(),
  subject: Joi.string().trim().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
  sortBy: Joi.string()
    .valid(
      "subject",
      "chapter",
      "class",
      "unit",
      "status",
      "questionSolved",
      "createdAt",
      "updatedAt"
    )
    .default("createdAt")
    .optional(),
  sortOrder: Joi.string().valid("asc", "desc").default("desc").optional(),
});

// Validation middleware
const validateChapter = (req, res, next) => {
  const { error, value } = chapterSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const errorDetails = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
      value: detail.context?.value,
    }));

    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: errorDetails,
    });
  }

  req.body = value;
  next();
};

const validateChaptersArray = (req, res, next) => {
  let chapters;

  // Handle both direct array and file upload
  if (req.file) {
    try {
      const fileContent = req.file.buffer.toString("utf8");
      chapters = JSON.parse(fileContent);
    } catch (parseError) {
      return res.status(400).json({
        status: "error",
        message: "Invalid JSON file format",
        error: parseError.message,
      });
    }
  } else {
    chapters = req.body;
  }

  if (!Array.isArray(chapters)) {
    return res.status(400).json({
      status: "error",
      message: "Expected an array of chapters",
    });
  }

  const validChapters = [];
  const invalidChapters = [];

  chapters.forEach((chapter, index) => {
    const { error, value } = chapterSchema.validate(chapter, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      invalidChapters.push({
        index,
        chapter,
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
          value: detail.context?.value,
        })),
      });
    } else {
      validChapters.push(value);
    }
  });

  req.validChapters = validChapters;
  req.invalidChapters = invalidChapters;
  next();
};

const validateQueryParams = (req, res, next) => {
  const { error, value } = queryParamsSchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const errorDetails = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
      value: detail.context?.value,
    }));

    return res.status(400).json({
      status: "error",
      message: "Invalid query parameters",
      errors: errorDetails,
    });
  }

  req.query = value;
  next();
};

module.exports = {
  validateChapter,
  validateChaptersArray,
  validateQueryParams,
  chapterSchema,
  chaptersArraySchema,
  queryParamsSchema,
};
