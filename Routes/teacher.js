const express = require("express");
const protect = require("../Middleware/protect");
const authorize = require("../Middleware/authorize");

const {
  getMyProfile,
  updateProfile,
  getTeacherById,
  getTeacherCourses,
  getTeacherBatches,
  getTeacherClasses,
  getTeacherStudents,
  getTeacherStats,
  getPublicTutors,
  getPublicTutorById,
} = require("../Controllers/teacher");

const router = express.Router();

// Public endpoints (no authentication required)
router.get("/public", getPublicTutors);
router.get("/public/:id", getPublicTutorById);

// Get logged-in teacher's profile
router.get(
  "/me",
  protect,
  authorize("teacher"),
  getMyProfile
);

// Get logged-in teacher's stats
router.get(
  "/me/stats",
  protect,
  authorize("teacher"),
  getTeacherStats
);

// Get logged-in teacher's batches
router.get(
  "/me/batches",
  protect,
  authorize("teacher"),
  getTeacherBatches
);

// Get logged-in teacher's live classes
router.get(
  "/me/classes",
  protect,
  authorize("teacher"),
  getTeacherClasses
);

// Get logged-in teacher's assigned students
router.get(
  "/me/students",
  protect,
  authorize("teacher"),
  getTeacherStudents
);

// Get logged-in teacher's courses
router.get(
  "/me/courses",
  protect,
  authorize("teacher"),
  getTeacherCourses
);

// Get a teacher by ID (admin only)
router.get(
  "/:id",
  protect,
  authorize("admin"),
  getTeacherById
);

// Update logged-in teacher's profile
router.patch(
  "/update",
  protect,
  authorize("teacher", "admin"),
  updateProfile
);

module.exports = router;
