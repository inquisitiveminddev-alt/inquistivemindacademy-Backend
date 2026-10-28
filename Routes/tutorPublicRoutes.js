const express = require("express");
const { getPublicTutors, getPublicTutorById } = require("../Controllers/teacher");

const router = express.Router();

router.get("/", getPublicTutors);
router.get("/:id", getPublicTutorById);

module.exports = router;
