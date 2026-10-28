const express = require("express");
const {
  getUsers,
  updateTeacherByAdmin,
  approveUser,
  rejectUser,
  blockUser,
  unblockUser,
  getUserById,
  updateUserByAdmin,
  getDashboardStats,
  getRecentEnrollments,
  getallClasses,
  getallAnnouncement,
  deleteUserByAdmin,
} = require("../Controllers/admin");

const {
  getTutorApplications,
  getTutorApplicationById,
  reviewTutorApplication,
  publishTeacherProfile,
  unpublishTeacherProfile,
  updateTeacherPublicSettings,
  deleteTutorApplication,
} = require("../Controllers/tutorApplicationAdmin");

const {
  getStudentRequirements,
  getStudentRequirementById,
  updateStudentRequirementStatus,
  addRequirementNote,
  deleteStudentRequirement,
} = require("../Controllers/studentRequirementAdmin");

const {
  getCandidatesForRequirement,
  shortlistCandidate,
  recommendCandidate,
  updateMatchStatus,
} = require("../Controllers/tutorMatchingAdmin");

const protect = require("../Middleware/protect");
const authorize = require("../Middleware/authorize");

const router = express.Router();

// Existing user management routes
router.get("/users", protect, authorize("admin"), getUsers);
router.get("/user/:id", protect, authorize("admin"), getUserById);
router.get("/dashboard-stats", protect, authorize("admin"), getDashboardStats);
router.get("/recent-activties", protect, authorize("admin"), getRecentEnrollments);
router.get("/all-classes", protect, authorize("admin"), getallClasses);
router.get("/all-announcements", protect, authorize("admin"), getallAnnouncement);
router.patch("/user/:id/approve", protect, authorize("admin"), approveUser);
router.patch("/user/:id/reject", protect, authorize("admin"), rejectUser);
router.patch("/user/:id/block", protect, authorize("admin"), blockUser);
router.patch("/user/:id/unblock", protect, authorize("admin"), unblockUser);
router.patch("/user/:id/update", protect, authorize("admin"), updateUserByAdmin);
router.delete("/user/:id", protect, authorize("admin"), deleteUserByAdmin);
router.patch("/teacher/:id/update", protect, authorize("admin"), updateTeacherByAdmin);

// Tutor Applications routes
router.get("/tutor-applications", protect, authorize("admin"), getTutorApplications);
router.get("/tutor-application/:id", protect, authorize("admin"), getTutorApplicationById);
router.patch("/tutor-application/:id/review", protect, authorize("admin"), reviewTutorApplication);
router.delete("/tutor-application/:id", protect, authorize("admin"), deleteTutorApplication);

// Teacher Publication & Visibility routes
router.patch("/teacher/:id/publish", protect, authorize("admin"), publishTeacherProfile);
router.patch("/teacher/:id/unpublish", protect, authorize("admin"), unpublishTeacherProfile);
router.patch("/teacher/:id/public-settings", protect, authorize("admin"), updateTeacherPublicSettings);

// Student Requirements routes
router.get("/student-requirements", protect, authorize("admin"), getStudentRequirements);
router.get("/student-requirement/:id", protect, authorize("admin"), getStudentRequirementById);
router.patch("/student-requirement/:id/status", protect, authorize("admin"), updateStudentRequirementStatus);
router.post("/student-requirement/:id/note", protect, authorize("admin"), addRequirementNote);
router.delete("/student-requirement/:id", protect, authorize("admin"), deleteStudentRequirement);

// Tutor Matching routes
router.get("/matching/candidates/:requirementId", protect, authorize("admin"), getCandidatesForRequirement);
router.post("/matching/shortlist", protect, authorize("admin"), shortlistCandidate);
router.post("/matching/recommend", protect, authorize("admin"), recommendCandidate);
router.patch("/matching/match/:matchId/status", protect, authorize("admin"), updateMatchStatus);

module.exports = router;
