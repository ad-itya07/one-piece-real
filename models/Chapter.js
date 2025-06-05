const mongoose = require("mongoose");

const yearWiseQuestionCountSchema = new mongoose.Schema(
  {
    2019: { type: Number, default: 0 },
    2020: { type: Number, default: 0 },
    2021: { type: Number, default: 0 },
    2022: { type: Number, default: 0 },
    2023: { type: Number, default: 0 },
    2024: { type: Number, default: 0 },
    2025: { type: Number, default: 0 },
  },
  { _id: false }
);

const chapterSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      index: true,
    },
    chapter: {
      type: String,
      required: [true, "Chapter name is required"],
      trim: true,
      index: true,
    },
    class: {
      type: String,
      required: [true, "Class is required"],
      trim: true,
      index: true,
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
      index: true,
    },
    yearWiseQuestionCount: {
      type: yearWiseQuestionCountSchema,
      required: true,
      default: {},
    },
    questionSolved: {
      type: Number,
      required: true,
      min: [0, "Questions solved cannot be negative"],
      default: 0,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["Not Started", "In Progress", "Completed", "Revision"],
        message:
          "Status must be one of: Not Started, In Progress, Completed, Revision",
      },
      default: "Not Started",
      index: true,
    },
    isWeakChapter: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for better query performance
chapterSchema.index({ subject: 1, class: 1 });
chapterSchema.index({ class: 1, unit: 1 });
chapterSchema.index({ status: 1, isWeakChapter: 1 });

// Virtual for total questions across all years
chapterSchema.virtual("totalQuestions").get(function () {
  if (!this.yearWiseQuestionCount) return 0;
  return Object.values(this.yearWiseQuestionCount).reduce(
    (sum, count) => sum + count,
    0
  );
});

// Virtual for completion percentage
chapterSchema.virtual("completionPercentage").get(function () {
  const total = this.totalQuestions;
  if (total === 0) return 0;
  return Math.round((this.questionSolved / total) * 100);
});

// Pre-save middleware to validate year-wise question counts
chapterSchema.pre("save", function (next) {
  if (this.yearWiseQuestionCount) {
    for (const [year, count] of Object.entries(this.yearWiseQuestionCount)) {
      if (count < 0) {
        return next(
          new Error(`Question count for year ${year} cannot be negative`)
        );
      }
    }
  }
  next();
});

// Static method to get all unique values for filters
chapterSchema.statics.getFilterOptions = async function () {
  const pipeline = [
    {
      $group: {
        _id: null,
        subjects: { $addToSet: "$subject" },
        classes: { $addToSet: "$class" },
        units: { $addToSet: "$unit" },
        statuses: { $addToSet: "$status" },
      },
    },
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || { subjects: [], classes: [], units: [], statuses: [] };
};

module.exports = mongoose.model("Chapter", chapterSchema);
