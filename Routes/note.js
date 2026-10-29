const express = require("express");
const protect = require("../Middleware/protect");
const authorize = require("../Middleware/authorize");
const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
} = require("../Controllers/note");
const upload = require("../Middleware/upload");

const router = express.Router();

router.post(
  "/:batchId/add",
  protect,
  authorize("admin", "teacher"),
  upload.single("file"),
  createNote
);

router.get(
  "/:batchId/notes",
  protect,
  getNotes
);

router.get(
  "/batches/:batchId/notes/:noteId",
  protect,
  getNoteById
);

router.patch(
  "/batches/:batchId/notes/:noteId",
  protect,
  authorize("admin", "teacher"),
  updateNote
);

router.delete(
  "/:noteId/delete",
  protect,
  authorize("admin", "teacher"),
  deleteNote
);

module.exports = router;
