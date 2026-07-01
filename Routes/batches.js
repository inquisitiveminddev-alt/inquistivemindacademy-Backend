const express = require("express");
const router = express.Router();
const protect = require("../Middleware/protect");
const authorize = require("../Middleware/authorize");
const upload = require("../Middleware/upload");
const { createBatch, getBatches, getBatchById, updateBatch, deleteBatch, addStudentToBatch, getBatchStudents, removeStudentFromBatch } = require("../Controllers/batches");
router.post("/:courseId/batches",protect, createBatch);

router.get("/:slug/batches", getBatches);

router.get("/:batchId/byId", getBatchById);

router.patch("/:batchId/update", updateBatch);

router.delete("/:courseId/batches/:batchId", deleteBatch);


router.get(
  "/:batchId/students",
  getBatchStudents
);


module.exports=router