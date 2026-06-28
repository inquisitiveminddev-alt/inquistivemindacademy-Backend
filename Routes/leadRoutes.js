const express = require("express");
const { saveLead, saveStudentLead, saveTeacherLead } = require("../Controllers/leadController");

const router = express.Router();

router.post("/students/save",saveStudentLead)
router.post("/teacher/save",saveTeacherLead)

module.exports=router