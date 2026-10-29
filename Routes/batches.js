const express = require("express");
const router = express.Router();
const protect = require("../Middleware/protect");
const authorize = require("../Middleware/authorize");
const {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  getBatchStudents,
} = require("../Controllers/batches");

router.post("/:courseId/batches", protect, authorize("admin"), createBatch);
router.get("/:slug/batches", getBatches);
router.get("/:batchId/byId", getBatchById);
router.patch("/:batchId/update", protect, authorize("admin"), updateBatch);
router.delete("/:courseId/batches/:batchId", protect, authorize("admin"), deleteBatch);
router.get("/:batchId/students", protect, getBatchStudents);

module.exports = router;
