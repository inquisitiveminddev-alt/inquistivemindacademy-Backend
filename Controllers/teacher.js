
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
        "city gender dateOfBirth subject experience qualification studentLevel mode bio availability timeSlot profileCompleted courses"
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

// GET: Teacher details by Teacher document ID

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

module.exports = {
  getMyProfile,
  updateProfile,
  getTeacherById,
  getTeacherCourses,
};
