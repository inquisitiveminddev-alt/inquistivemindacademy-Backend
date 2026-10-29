const express = require("express");
const protect = require("../Middleware/protect");
const authorize = require("../Middleware/authorize");
const {
  deleteClassLink,
  updateClassLink,
  getClassLinkById,
  getClassLinks,
  createClassLink,
} = require("../Controllers/classLink");

const router = express.Router();

router.post(
  "/:batchId/add",
  protect,
  authorize("admin", "teacher"),
  createClassLink
);

router.get(
  "/:batchId/class-links",
  protect,
  getClassLinks
);

router.get(
  "/batches/:batchId/class-links/:classLinkId",
  protect,
  getClassLinkById
);

router.patch(
  "/batches/:batchId/class-links/:classLinkId",
  protect,
  authorize("admin", "teacher"),
  updateClassLink
);

router.delete(
  "/:classLinkId/delete",
  protect,
  authorize("admin", "teacher"),
  deleteClassLink
);

module.exports = router;
