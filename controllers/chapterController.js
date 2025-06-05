const Chapter = require("../models/Chapter");
const { clearChapterCache } = require("../middleware/cache");

// Get all chapters with filtering and pagination
const getAllChapters = async (req, res, next) => {
  try {
    const {
      class: className,
      unit,
      status,
      weakChapters,
      subject,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    // Build filter object
    const filter = {};

    if (className) filter.class = new RegExp(className, "i");
    if (unit) filter.unit = new RegExp(unit, "i");
    if (status) filter.status = status;
    if (weakChapters !== undefined) filter.isWeakChapter = weakChapters;
    if (subject) filter.subject = new RegExp(subject, "i");

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [chapters, totalCount, filterOptions] = await Promise.all([
      Chapter.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Chapter.countDocuments(filter),
      Chapter.getFilterOptions(),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      status: "success",
      data: {
        chapters,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null,
        },
        filters: {
          applied: { className, unit, status, weakChapters, subject },
          available: filterOptions,
        },
        sort: { sortBy, sortOrder },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// Get single chapter by ID
const getChapterById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const chapter = await Chapter.findById(id).lean();

    if (!chapter) {
      return res.status(404).json({
        status: "error",
        message: "Chapter not found",
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      status: "success",
      data: { chapter },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// Create chapters (Admin only)
const createChapters = async (req, res, next) => {
  try {
    const { validChapters, invalidChapters } = req;

    let savedChapters = [];
    let failedChapters = [...invalidChapters]; // Include validation failures

    // Process valid chapters
    if (validChapters.length > 0) {
      try {
        // Use insertMany for better performance, but handle duplicates
        const insertOptions = {
          ordered: false, // Continue processing even if some documents fail
        };

        // Without rawResult: true, this returns the actual inserted documents
        savedChapters = await Chapter.insertMany(validChapters, insertOptions);

        // Clear cache after successful insertion
        await clearChapterCache();
      } catch (bulkError) {
        // Handle bulk insert errors (like duplicates)
        if (bulkError.writeErrors) {
          bulkError.writeErrors.forEach((writeError, index) => {
            failedChapters.push({
              index: index,
              chapter: validChapters[writeError.index],
              errors: [
                {
                  field: "document",
                  message: writeError.errmsg || "Database insertion failed",
                  code: writeError.code,
                },
              ],
            });
          });

          // Get successfully inserted documents
          savedChapters = bulkError.insertedDocs || [];
          // Ensure savedChapters is an array
          if (!Array.isArray(savedChapters)) {
            savedChapters = [];
          }
        } else {
          throw bulkError;
        }
      }
    }

    // Ensure savedChapters is always an array before calling .map()
    if (!Array.isArray(savedChapters)) {
      savedChapters = [];
    }

    // Prepare response
    const response = {
      status: savedChapters.length > 0 ? "success" : "error",
      message: `${savedChapters.length} chapters saved successfully`,
      data: {
        savedCount: savedChapters.length,
        failedCount: failedChapters.length,
        savedChapters: savedChapters.map((chapter) => ({
          id: chapter._id,
          subject: chapter.subject,
          chapter: chapter.chapter,
          class: chapter.class,
          unit: chapter.unit,
        })),
      },
      timestamp: new Date().toISOString(),
    };

    // Include failed chapters if any
    if (failedChapters.length > 0) {
      response.data.failedChapters = failedChapters;
      response.message += `, ${failedChapters.length} chapters failed`;
    }

    const statusCode = savedChapters.length > 0 ? 201 : 400;
    res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
};

// Update chapter by ID (Admin only)
const updateChapter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const chapter = await Chapter.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      lean: true,
    });

    if (!chapter) {
      return res.status(404).json({
        status: "error",
        message: "Chapter not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Clear cache after update
    await clearChapterCache();

    res.status(200).json({
      status: "success",
      message: "Chapter updated successfully",
      data: { chapter },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// Delete chapter by ID (Admin only)
const deleteChapter = async (req, res, next) => {
  try {
    const { id } = req.params;

    const chapter = await Chapter.findByIdAndDelete(id);

    if (!chapter) {
      return res.status(404).json({
        status: "error",
        message: "Chapter not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Clear cache after deletion
    await clearChapterCache();

    res.status(200).json({
      status: "success",
      message: "Chapter deleted successfully",
      data: {
        deletedChapter: {
          id: chapter._id,
          subject: chapter.subject,
          chapter: chapter.chapter,
          class: chapter.class,
          unit: chapter.unit,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// Get statistics
const getStatistics = async (req, res, next) => {
  try {
    const stats = await Chapter.aggregate([
      {
        $group: {
          _id: null,
          totalChapters: { $sum: 1 },
          totalQuestionsSolved: { $sum: "$questionSolved" },
          weakChapters: {
            $sum: { $cond: ["$isWeakChapter", 1, 0] },
          },
          statusDistribution: {
            $push: "$status",
          },
          subjectDistribution: {
            $push: "$subject",
          },
          avgCompletionRate: {
            $avg: {
              $cond: [
                {
                  $gt: [
                    {
                      $sum: [
                        Object.values({
                          2019: 1,
                          2020: 1,
                          2021: 1,
                          2022: 1,
                          2023: 1,
                          2024: 1,
                          2025: 1,
                        }).map((year) => `$yearWiseQuestionCount.${year}`),
                      ],
                    },
                    0,
                  ],
                },
                {
                  $multiply: [
                    {
                      $divide: [
                        "$questionSolved",
                        {
                          $sum: [
                            Object.values({
                              2019: 1,
                              2020: 1,
                              2021: 1,
                              2022: 1,
                              2023: 1,
                              2024: 1,
                              2025: 1,
                            }).map((year) => `$yearWiseQuestionCount.${year}`),
                          ],
                        },
                      ],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalChapters: 0,
      totalQuestionsSolved: 0,
      weakChapters: 0,
      statusDistribution: [],
      subjectDistribution: [],
      avgCompletionRate: 0,
    };

    // Process distributions
    const statusCounts = result.statusDistribution.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const subjectCounts = result.subjectDistribution.reduce((acc, subject) => {
      acc[subject] = (acc[subject] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      status: "success",
      data: {
        overview: {
          totalChapters: result.totalChapters,
          totalQuestionsSolved: result.totalQuestionsSolved,
          weakChapters: result.weakChapters,
          averageCompletionRate: Math.round(result.avgCompletionRate || 0),
        },
        distributions: {
          status: statusCounts,
          subject: subjectCounts,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllChapters,
  getChapterById,
  createChapters,
  updateChapter,
  deleteChapter,
  getStatistics,
};
