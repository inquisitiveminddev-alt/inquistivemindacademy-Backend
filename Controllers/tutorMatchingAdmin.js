const mongoose = require("mongoose");
const asyncHandler = require("../Utils/asyncHandler");
const StudentRequirement = require("../Modals/StudentRequirement");
const Teacher = require("../Modals/Teacher");
const TutorMatch = require("../Modals/TutorMatch");
const { matchRequirement } = require("../Utils/matchingEngine");

/**
 * GET /api/admin/matching/candidates/:requirementId
 * Compute deterministic matches for a requirement against approved active teachers.
 */
const getCandidatesForRequirement = asyncHandler(async (req, res) => {
  const { requirementId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(requirementId)) {
    return res.status(400).json({ success: false, message: "Invalid requirement ID." });
  }

  const requirement = await StudentRequirement.findOne({
    _id: requirementId,
    isDeleted: false,
  }).lean();

  if (!requirement) {
    return res.status(404).json({ success: false, message: "Requirement not found." });
  }

  // Load active, approved teachers with populated user account
  const teachers = await Teacher.find({ isDeleted: false })
    .populate({
      path: "user",
      match: { isDeleted: false, status: "active", approvalStatus: "approved" },
      select: "fullName email phone profileImage status approvalStatus",
    })
    .lean();

  // Filter out teachers whose user account was not matched (e.g. blocked or pending)
  const eligibleTeachers = teachers.filter((t) => t.user && t.user._id);

  // Run explainable matching engine
  const scoredCandidates = matchRequirement(requirement, eligibleTeachers);

  // Cross-reference existing TutorMatch records for this requirement
  const existingMatches = await TutorMatch.find({ requirement: requirementId }).lean();
  const matchMap = new Map();
  for (const m of existingMatches) {
    matchMap.set(m.teacher.toString(), m);
  }

  const candidates = scoredCandidates.map((c) => {
    const existing = matchMap.get(c.teacher._id.toString());
    return {
      teacherId: c.teacher._id,
      userId: c.user._id,
      fullName: c.user.fullName,
      email: c.user.email,
      phone: c.user.phone,
      profileImage: c.user.profileImage?.url || null,
      subject: c.teacher.subject,
      city: c.teacher.city,
      mode: c.teacher.mode,
      experience: c.teacher.experience,
      qualification: c.teacher.qualification,
      studentLevel: c.teacher.studentLevel,
      availability: c.teacher.availability,
      timeSlot: c.teacher.timeSlot,
      isPublished: c.teacher.isPublished,
      rating: c.teacher.rating,
      hourlyRate: c.teacher.hourlyRate,
      score: c.score,
      reasons: c.reasons,
      existingMatch: existing || null,
      currentStatus: existing ? existing.status : "unmatched",
    };
  });

  return res.status(200).json({
    success: true,
    requirement,
    totalCandidates: candidates.length,
    candidates,
  });
});

/**
 * POST /api/admin/matching/shortlist
 * Shortlists a tutor for a student requirement.
 */
const shortlistCandidate = asyncHandler(async (req, res) => {
  const { requirementId, teacherId, notes = "" } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(requirementId) ||
    !mongoose.Types.ObjectId.isValid(teacherId)
  ) {
    return res.status(400).json({ success: false, message: "Valid requirementId and teacherId are required." });
  }

  const [requirement, teacher] = await Promise.all([
    StudentRequirement.findOne({ _id: requirementId, isDeleted: false }),
    Teacher.findOne({ _id: teacherId, isDeleted: false }).populate("user"),
  ]);

  if (!requirement || !teacher) {
    return res.status(404).json({ success: false, message: "Requirement or teacher not found." });
  }

  // Upsert match
  let match = await TutorMatch.findOne({ requirement: requirementId, teacher: teacherId });

  if (match) {
    match.status = "shortlisted";
    match.shortlistedAt = new Date();
    if (notes) match.adminNotes = notes.trim();
    match.updatedBy = req.user._id;
    await match.save();
  } else {
    match = await TutorMatch.create({
      requirement: requirementId,
      teacher: teacherId,
      user: teacher.user._id,
      score: req.body.score || 0,
      reasons: req.body.reasons || [],
      status: "shortlisted",
      shortlistedAt: new Date(),
      adminNotes: notes ? notes.trim() : "",
      createdBy: req.user._id,
    });
  }

  // Update requirement status to matched if it was open
  if (requirement.status === "open") {
    requirement.status = "matched";
    requirement.adminNotes.push({
      note: `Shortlisted tutor: ${teacher.user.fullName} (${teacher.subject})`,
      admin: req.user._id,
      createdAt: new Date(),
    });
    await requirement.save();
  }

  return res.status(200).json({
    success: true,
    message: "Tutor shortlisted successfully.",
    match,
  });
});

/**
 * POST /api/admin/matching/recommend
 * Recommends a tutor to student.
 */
const recommendCandidate = asyncHandler(async (req, res) => {
  const { requirementId, teacherId, notes = "" } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(requirementId) ||
    !mongoose.Types.ObjectId.isValid(teacherId)
  ) {
    return res.status(400).json({ success: false, message: "Valid requirementId and teacherId are required." });
  }

  const [requirement, teacher] = await Promise.all([
    StudentRequirement.findOne({ _id: requirementId, isDeleted: false }),
    Teacher.findOne({ _id: teacherId, isDeleted: false }).populate("user"),
  ]);

  if (!requirement || !teacher) {
    return res.status(404).json({ success: false, message: "Requirement or teacher not found." });
  }

  let match = await TutorMatch.findOne({ requirement: requirementId, teacher: teacherId });

  if (match) {
    match.status = "recommended";
    match.recommendedAt = new Date();
    if (notes) match.adminNotes = notes.trim();
    match.updatedBy = req.user._id;
    await match.save();
  } else {
    match = await TutorMatch.create({
      requirement: requirementId,
      teacher: teacherId,
      user: teacher.user._id,
      score: req.body.score || 0,
      reasons: req.body.reasons || [],
      status: "recommended",
      recommendedAt: new Date(),
      adminNotes: notes ? notes.trim() : "",
      createdBy: req.user._id,
    });
  }

  if (requirement.status === "open" || requirement.status === "matched") {
    requirement.adminNotes.push({
      note: `Recommended tutor: ${teacher.user.fullName} (${teacher.subject})`,
      admin: req.user._id,
      createdAt: new Date(),
    });
    await requirement.save();
  }

  return res.status(200).json({
    success: true,
    message: "Tutor recommended successfully.",
    match,
  });
});

/**
 * PATCH /api/admin/matching/match/:matchId/status
 * Updates the outcome status of a match.
 */
const updateMatchStatus = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { status, adminNotes } = req.body;

  if (!mongoose.Types.ObjectId.isValid(matchId)) {
    return res.status(400).json({ success: false, message: "Invalid match ID." });
  }

  const validStatuses = ["suggested", "shortlisted", "recommended", "contacted", "accepted", "rejected"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid match status." });
  }

  const match = await TutorMatch.findById(matchId);

  if (!match) {
    return res.status(404).json({ success: false, message: "Match record not found." });
  }

  match.status = status;
  if (adminNotes !== undefined) {
    match.adminNotes = adminNotes.trim();
  }
  if (["contacted", "accepted", "rejected"].includes(status)) {
    match.outcomeAt = new Date();
  }
  match.updatedBy = req.user._id;

  await match.save();

  return res.status(200).json({
    success: true,
    message: `Match status updated to ${status}.`,
    match,
  });
});

module.exports = {
  getCandidatesForRequirement,
  shortlistCandidate,
  recommendCandidate,
  updateMatchStatus,
};
