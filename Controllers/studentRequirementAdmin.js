const mongoose = require("mongoose");
const asyncHandler = require("../Utils/asyncHandler");
const StudentRequirement = require("../Modals/StudentRequirement");
const TutorMatch = require("../Modals/TutorMatch");

/**
 * GET /api/admin/student-requirements
 * List student tutor requirements with search, status filters, and pagination.
 */
const getStudentRequirements = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    status,
    subject,
    mode,
    sort = "newest",
  } = req.query;

  const currentPage = Math.max(Number(page), 1);
  const perPage = Math.min(Math.max(Number(limit), 1), 100);
  const skip = (currentPage - 1) * perPage;

  const filter = { isDeleted: false };

  if (status && status !== "all") {
    filter.status = status;
  }

  if (subject && subject !== "all") {
    filter.subject = { $regex: subject, $options: "i" };
  }

  if (mode && mode !== "all") {
    filter.mode = { $regex: mode, $options: "i" };
  }

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { referenceCode: { $regex: s, $options: "i" } },
      { name: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
      { phone: { $regex: s, $options: "i" } },
      { subject: { $regex: s, $options: "i" } },
      { city: { $regex: s, $options: "i" } },
    ];
  }

  const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

  const [requirements, total] = await Promise.all([
    StudentRequirement.find(filter)
      .populate("user", "fullName email phone role status")
      .populate("assignedTo", "fullName email")
      .sort(sortOption)
      .skip(skip)
      .limit(perPage)
      .lean(),
    StudentRequirement.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    requirements,
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      hasNextPage: currentPage * perPage < total,
      hasPreviousPage: currentPage > 1,
    },
  });
});

/**
 * GET /api/admin/student-requirement/:id
 * Retrieve a single student requirement by ID along with existing matches.
 */
const getStudentRequirementById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid requirement ID." });
  }

  const requirement = await StudentRequirement.findOne({ _id: id, isDeleted: false })
    .populate("user", "fullName email phone role")
    .populate("assignedTo", "fullName email")
    .populate("adminNotes.admin", "fullName email")
    .lean();

  if (!requirement) {
    return res.status(404).json({ success: false, message: "Requirement not found." });
  }

  // Load existing match records for this requirement
  const matches = await TutorMatch.find({ requirement: id })
    .populate({
      path: "teacher",
      populate: { path: "user", select: "fullName email phone profileImage" },
    })
    .populate("createdBy", "fullName")
    .sort({ score: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    requirement,
    matches,
  });
});

/**
 * PATCH /api/admin/student-requirement/:id/status
 * Update requirement status and record an activity note.
 */
const updateStudentRequirementStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid requirement ID." });
  }

  const validStatuses = ["open", "matched", "contacted", "converted", "closed", "cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status provided." });
  }

  const requirement = await StudentRequirement.findOne({ _id: id, isDeleted: false });

  if (!requirement) {
    return res.status(404).json({ success: false, message: "Requirement not found." });
  }

  requirement.status = status;

  if (status === "contacted") {
    requirement.lastContactedAt = new Date();
  }

  if (note && note.trim()) {
    requirement.adminNotes.push({
      note: note.trim(),
      admin: req.user._id,
      createdAt: new Date(),
    });
  }

  await requirement.save();

  return res.status(200).json({
    success: true,
    message: `Requirement status updated to ${status}.`,
    requirement,
  });
});

/**
 * POST /api/admin/student-requirement/:id/note
 * Add an admin note to a student requirement.
 */
const addRequirementNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid requirement ID." });
  }

  if (!note || !note.trim()) {
    return res.status(400).json({ success: false, message: "Note content is required." });
  }

  const requirement = await StudentRequirement.findOne({ _id: id, isDeleted: false });

  if (!requirement) {
    return res.status(404).json({ success: false, message: "Requirement not found." });
  }

  requirement.adminNotes.push({
    note: note.trim(),
    admin: req.user._id,
    createdAt: new Date(),
  });

  await requirement.save();

  return res.status(200).json({
    success: true,
    message: "Note added successfully.",
    adminNotes: requirement.adminNotes,
  });
});


/**
 * DELETE /api/admin/student-requirement/:id
 * Safely soft-deletes a student requirement and removes lingering match records.
 */
const deleteStudentRequirement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid requirement ID." });
  }

  const requirement = await StudentRequirement.findOne({ _id: id, isDeleted: false });

  if (!requirement) {
    return res.status(404).json({ success: false, message: "Student requirement not found." });
  }

  requirement.isDeleted = true;
  requirement.deletedAt = new Date();
  requirement.deletedBy = req.user._id;
  await requirement.save();

  // Clean up any TutorMatch records associated with this deleted requirement
  await TutorMatch.deleteMany({ requirement: id });

  return res.status(200).json({
    success: true,
    message: "Student requirement deleted successfully.",
  });
});

module.exports = {
  getStudentRequirements,
  getStudentRequirementById,
  updateStudentRequirementStatus,
  addRequirementNote,
  deleteStudentRequirement,
};

