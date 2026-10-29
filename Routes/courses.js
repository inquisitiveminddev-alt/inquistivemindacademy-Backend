const express = require("express");
const protect = require("../Middleware/protect");
const authorize = require("../Middleware/authorize");
const upload = require("../Middleware/upload");
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  publishCourse,
  archiveCourse,
} = require("../Controllers/Courses");

const router = express.Router();

router.post("/createCourse", protect, authorize("admin"), upload.single("image"), createCourse);
router.get("/", protect, authorize("admin"), getCourses);
router.get("/:courseId", protect, getCourseById);
router.patch("/:courseId", protect, authorize("admin"), upload.single("image"), updateCourse);
router.delete("/:courseId", protect, authorize("admin"), deleteCourse);
router.patch("/:courseId/publish", protect, authorize("admin"), publishCourse);
router.patch("/:courseId/archive", protect, authorize("admin"), archiveCourse);

module.exports = router;
