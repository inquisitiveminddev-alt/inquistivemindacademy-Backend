const mongoose = require("mongoose");

const User = require("../Modals/User");
const Teacher = require("../Modals/Teacher");
const asyncHandler = require("../Utils/asyncHandler");

// Fields stored in the User model
const USER_FIELDS = ["fullName", "phone"];

// Fields stored in the Teacher model
const TEACHER_FIELDS = [
  "city",
  "gender",
  "dateOfBirth",
  "subject",
  "experience",
  "qualification",
  "studentLevel",
  "mode",
  "bio",
  "availability",
  "timeSlot",
];

/**
 * Strict allowlist serializer for public tutor profiles.
 * Sensitive data (email, phone, internal notes, passwords) is never returned.
 */
function serializePublicTeacher(teacher) {
  if (!teacher) return null;
  const user = teacher.user || {};
  const allowed =
    Array.isArray(teacher.allowedPublicFields) && teacher.allowedPublicFields.length > 0
      ? teacher.allowedPublicFields
      : [
          "fullName",
          "city",
          "subject",
          "experience",
          "qualification",
          "studentLevel",
          "mode",
          "bio",
          "availability",
          "timeSlot",
          "profileImage",
          "headline",
          "hourlyRate",
          "rating",
          "reviewsCount",
        ];

  const fullData = {
    id: teacher._id,
    fullName: user.fullName || "Academy Tutor",
    profileImage: user.profileImage?.url || null,
    city: teacher.city || "",
    subject: teacher.subject || "",
    experience: teacher.experience || "",
    qualification: teacher.qualification || "",
    studentLevel: teacher.studentLevel || "",
    mode: teacher.mode || "",
    bio: teacher.bio || "",
    availability: teacher.availability || [],
    timeSlot: teacher.timeSlot || [],
    headline: teacher.headline || "",
    hourlyRate: teacher.hourlyRate || { min: 0, max: 0, currency: "INR" },
    rating: teacher.rating || 5.0,
    reviewsCount: teacher.reviewsCount || 0,
    coursesCount: (teacher.courses || []).length,
  };

  const serialized = { id: fullData.id };
  for (const field of allowed) {
    if (fullData[field] !== undefined) {
      serialized[field] = fullData[field];
    }
  }

  return serialized;
}

// GET: Logged-in teacher's profile
const getMyProfile = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({
    user: req.user._id,
    isDeleted: false,
  }).populate(
    "user",
    "fullName email phone profileImage role status approvalStatus"
  );

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: "Teacher not found.",
    });
  }

  return res.status(200).json({
    success: true,
    teacher,
  });
});

// PATCH: Update logged-in teacher's profile
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const body = req.body;

  const userUpdates = {};
  const teacherUpdates = {};

  // Whitelist allowed fields to prevent arbitrary updates
  for (const [key, value] of Object.entries(body)) {
    if (USER_FIELDS.includes(key)) {
      userUpdates[key] = value;
    } else if (TEACHER_FIELDS.includes(key)) {
      teacherUpdates[key] = value;
    }
  }

  if (
    Object.keys(userUpdates).length === 0 &&
    Object.keys(teacherUpdates).length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "No valid profile fields provided.",
    });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Ensure the account and teacher profile both exist
    const [user, teacher] = await Promise.all([
      User.findOne({
        _id: userId,
        isDeleted: false,
      }).session(session),

      Teacher.findOne({
        user: userId,
        isDeleted: false,
      }).session(session),
    ]);

    if (!user || !teacher) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: !user ? "User not found." : "Teacher not found.",
      });
    }

    if (Object.keys(userUpdates).length > 0) {
      await User.updateOne(
        {
          _id: userId,
          isDeleted: false,
        },
        {
          $set: userUpdates,
        },
        {
          session,
          runValidators: true,
        }
      );
    }

    if (Object.keys(teacherUpdates).length > 0) {
      await Teacher.updateOne(
        {
          user: userId,
          isDeleted: false,
        },
        {
          $set: teacherUpdates,
        },
        {
          session,
          runValidators: true,
        }
      );
    }

    await session.commitTransaction();

    // Fetch fresh data after the transaction succeeds
    const [updatedUser, updatedTeacher] = await Promise.all([
      User.findOne({
        _id: userId,
        isDeleted: false,
      }).select("fullName email phone profileImage role status"),

      Teacher.findOne({
        user: userId,
        isDeleted: false,
      }).select(
        "city gender dateOfBirth subject experience qualification studentLevel mode bio availability timeSlot profileCompleted courses isPublished headline hourlyRate rating reviewsCount"
      ),
    ]);

    return res.status(200).json({
      success: true,
      message: "Teacher profile updated successfully.",
      data: {
        user: updatedUser,
        profile: updatedTeacher,
      },
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    throw err;
  } finally {
    await session.endSession();
  }
});

// GET: Teacher details by User ID (admin only)
const getTeacherById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID.",
    });
  }

  const teacher = await Teacher.findOne({
    user: id,
    isDeleted: false,
  }).populate(
    "user",
    "fullName email phone profileImage role status approvalStatus"
  );

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: "Teacher profile not found.",
    });
  }

  return res.status(200).json({
    success: true,
    teacher,
  });
});

// GET: Courses assigned to the logged-in teacher
const getTeacherCourses = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({
    user: req.user._id,
    isDeleted: false,
  }).populate("courses");

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: "Teacher not found.",
    });
  }

  return res.status(200).json({
    success: true,
    count: teacher.courses.length,
    courses: teacher.courses,
  });
});

/**
 * GET /api/teacher/public
 * Public tutor directory (strict security: approved, published, active only).
 */
const getPublicTutors = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    search = "",
    subject,
    mode,
    city,
    sort = "rating",
  } = req.query;

  const currentPage = Math.max(Number(page), 1);
  const perPage = Math.min(Math.max(Number(limit), 1), 50);
  const skip = (currentPage - 1) * perPage;

  const filter = {
    isDeleted: false,
    isPublished: true,
  };

  if (subject && subject !== "all") {
    filter.subject = { $regex: subject, $options: "i" };
  }

  if (mode && mode !== "all") {
    filter.mode = { $regex: mode, $options: "i" };
  }

  if (city && city !== "all") {
    filter.city = { $regex: city, $options: "i" };
  }

  const sortOption = sort === "newest" ? { createdAt: -1 } : { rating: -1, reviewsCount: -1 };

  const teachers = await Teacher.find(filter)
    .populate({
      path: "user",
      match: { isDeleted: false, status: "active", approvalStatus: "approved" },
      select: "fullName profileImage status approvalStatus",
    })
    .sort(sortOption)
    .lean();

  let eligible = teachers.filter((t) => t.user && t.user._id);

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    eligible = eligible.filter((t) => {
      const name = (t.user?.fullName || "").toLowerCase();
      const subj = (t.subject || "").toLowerCase();
      const cty = (t.city || "").toLowerCase();
      const bio = (t.bio || "").toLowerCase();
      return name.includes(s) || subj.includes(s) || cty.includes(s) || bio.includes(s);
    });
  }

  const total = eligible.length;
  const paginated = eligible.slice(skip, skip + perPage);
  const tutors = paginated.map(serializePublicTeacher);

  return res.status(200).json({
    success: true,
    tutors,
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      hasNextPage: currentPage * perPage < total,
      hasPreviousPage: currentPage > 1,
    },
  });
});

/**
 * GET /api/teacher/public/:id
 * Public single tutor profile by teacher ID.
 */
const getPublicTutorById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid tutor ID." });
  }

  const teacher = await Teacher.findOne({
    _id: id,
    isDeleted: false,
    isPublished: true,
  })
    .populate({
      path: "user",
      match: { isDeleted: false, status: "active", approvalStatus: "approved" },
      select: "fullName profileImage status approvalStatus",
    })
    .lean();

  if (!teacher || !teacher.user) {
    return res.status(404).json({
      success: false,
      message: "Tutor profile not found or is currently not publicly available.",
    });
  }

  return res.status(200).json({
    success: true,
    tutor: serializePublicTeacher(teacher),
  });
});

module.exports = {
  getMyProfile,
  updateProfile,
  getTeacherById,
  getTeacherCourses,
  getPublicTutors,
  getPublicTutorById,
  serializePublicTeacher,
};
