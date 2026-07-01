const Note = require("../Modals/Note");
const Batch = require("../Modals/Batches");
const asyncHandler = require("../Utils/asyncHandler");
const uploadToCloudinary = require("../Utils/Cloudinary");

const createNote = asyncHandler(async (req, res) => {

  if (!req.file) {
  return res.status(400).json({
    success: false,
    message: "Please upload a note file.",
  });
}
  const batch = await Batch.findOne({
   _id: req.params.batchId,
   isDeleted:false
});

  if (!batch) {
    return res.status(404).json({
      success: false,
      message: "Batch not found.",
    });
  }
  const result = await uploadToCloudinary(
    req.file.buffer,
    "notes",
    "raw"
  );
const lastNote = await Note.findOne({
  batch: batch._id,
  isDeleted: false,
})
.sort({ noteNumber: -1 })
.select("noteNumber");

const noteNumber = lastNote ? lastNote.noteNumber + 1 : 1;
  const note = await Note.create({
    title: req.body.title,
    description: req.body.description,
    batch: batch._id,
    file: {
       publicId: result.public_id,
  url: result.secure_url,
  originalName: result.original_filename,
  size: result.bytes,
  mimeType: result.resource_type,
    },
  noteNumber,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Note uploaded successfully.",
    note,
  });
});
const getNotes = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
  _id: req.params.batchId,
  isDeleted: false,
});

if (!batch) {
  return res.status(404).json({
    success: false,
    message: "Batch not found.",
  });
}
  const notes = await Note.find({
    batch: req.params.batchId,
     isDeleted:false
  })
    .populate("createdBy", "fullName")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    count: notes.length,
    notes,
  });
});
const getNoteById = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
   _id: req.params.noteId,
    isDeleted:false
});

  if (!note) {
    return res.status(404).json({
      success: false,
      message: "Note not found.",
    });
  }

  res.status(200).json({
    success: true,
    note,
  });
});
const updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findOneAndUpdate({
  _id:  req.params.noteId,
   isDeleted:false
  },{
      $set: req.body,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!note) {
    return res.status(404).json({
      success: false,
      message: "Note not found.",
    });
  }

  res.status(200).json({
    success: true,
    message: "Note updated successfully.",
    note,
  });
});
const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.noteId,
    isDeleted: false,
  });

  if (!note) {
    return res.status(404).json({
      success: false,
      message: "Note not found.",
    });
  }

  note.isDeleted = true;
  note.deletedAt = new Date();
  note.deletedBy = req.user._id;

  await note.save();

  res.status(200).json({
    success: true,
    message: "Note deleted successfully.",
  });
});
module.exports={createNote,getNotes,getNoteById,updateNote,deleteNote}