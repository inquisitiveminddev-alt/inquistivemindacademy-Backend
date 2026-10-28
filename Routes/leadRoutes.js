const express = require("express");
const { saveStudentLead, saveTeacherLead } = require("../Controllers/leadController");
const optionalAuth = require("../Middleware/optionalAuth");

const router = express.Router();

router.post("/students/save", optionalAuth, saveStudentLead);
router.post("/teacher/save", optionalAuth, saveTeacherLead);

module.exports = router;
