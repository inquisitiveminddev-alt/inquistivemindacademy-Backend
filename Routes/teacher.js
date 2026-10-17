
const express = require("express");
const protect = require("../Middleware/protect");
const authorize = require("../Middleware/authorize");

const {
  getMyProfile,
  updateProfile,
  getTeacherById,
  getTeacherCourses,
} = require("../Controllers/teacher");

const router = express.Router();

// Get logged-in teacher's profile
router.get(
  "/me",
  protect,
  authorize("teacher"),
  getMyProfile
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
