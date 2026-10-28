const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const asyncHandler = require("../Utils/asyncHandler");
const TutorApplication = require("../Modals/TutorApplication");
const Teacher = require("../Modals/Teacher");
const User = require("../Modals/User");
const sendEmail = require("../Utils/sendEmail");

/**
 * Normalizes user-submitted teaching mode into clean standard value.
 */
function normalizeTeachingMode(mode) {
  const m = (mode || "").toLowerCase();
  if (
    m.includes("hybrid") ||
    (m.includes("online") && (m.includes("home") || m.includes("offline")))
  ) {
    return "Hybrid Teaching";
  }
  if (m.includes("online")) {
    return "Online Classes";
  }
  if (m.includes("home") || m.includes("offline")) {
    return "Home Tutoring";
  }
  return mode || "Online Classes";
}

/**
 * GET /api/admin/tutor-applications
 * List tutor applications with search, status filters, and pagination.
 */
const getTutorApplications = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    status,
    subject,
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

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { fullName: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
      { phone: { $regex: s, $options: "i" } },
      { subject: { $regex: s, $options: "i" } },
      { city: { $regex: s, $options: "i" } },
    ];
  }

  const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

  const [applications, total] = await Promise.all([
    TutorApplication.find(filter)
      .populate("user", "fullName email phone role status approvalStatus")
      .populate("teacher", "isPublished subject city mode")
      .populate("reviewedBy", "fullName email")
      .sort(sortOption)
      .skip(skip)
      .limit(perPage)
      .lean(),
    TutorApplication.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    applications,
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
 * GET /api/admin/tutor-application/:id
 * Retrieve a single tutor application by ID.
 */
const getTutorApplicationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid application ID." });
  }

  const application = await TutorApplication.findOne({ _id: id, isDeleted: false })
    .populate("user", "fullName email phone role status approvalStatus profileImage")
    .populate("teacher")
    .populate("reviewedBy", "fullName email")
    .populate("reviewNotes.admin", "fullName email")
    .lean();

  if (!application) {
    return res.status(404).json({ success: false, message: "Application not found." });
  }

  return res.status(200).json({
    success: true,
    application,
  });
});

/**
 * PATCH /api/admin/tutor-application/:id/review
 * Update application status: approve, reject, under_review, info_requested.
 */
const reviewTutorApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note, infoMessage, rejectionReason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid application ID." });
  }

  const validStatuses = ["pending", "under_review", "approved", "rejected", "info_requested"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status provided." });
  }

  const session = await mongoose.startSession();
  let application;
  let linkedTeacher = null;

  try {
    session.startTransaction();

    application = await TutorApplication.findOne({ _id: id, isDeleted: false }).session(session);

    if (!application) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    application.status = status;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();

    if (note && note.trim()) {
      application.reviewNotes.push({
        note: note.trim(),
        admin: req.user._id,
        createdAt: new Date(),
      });
    }

    if (status === "info_requested" && infoMessage) {
      application.infoRequestedMessage = infoMessage.trim();
    }

    if (status === "rejected" && rejectionReason) {
      application.rejectionReason = rejectionReason.trim();
    }

    // If approving, link and create/update Teacher document
    if (status === "approved") {
      let targetUser = null;

      if (application.user) {
        targetUser = await User.findById(application.user).session(session);
      } else {
        targetUser = await User.findOne({ email: application.email, isDeleted: false }).session(session);
      }

      if (!targetUser) {
        // Visitor submitted without prior account: create user account with temporary password
        const tempPassword = crypto.randomBytes(8).toString("hex") + "!Aa1";
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const createdUser = await User.create(
          [
            {
              fullName: application.fullName,
              email: application.email,
              phone: application.phone || "",
              password: hashedPassword,
              role: "teacher",
              approvalStatus: "approved",
              status: "active",
              emailVerified: true,
            },
          ],
          { session }
        );
        targetUser = createdUser[0];
      } else {
        targetUser.role = "teacher";
        targetUser.approvalStatus = "approved";
        if (application.phone && !targetUser.phone) {
          targetUser.phone = application.phone;
        }
        await targetUser.save({ session });
      }

      application.user = targetUser._id;

      // Ensure teacher profile exists
      linkedTeacher = await Teacher.findOne({ user: targetUser._id, isDeleted: false }).session(session);
      const normalizedMode = normalizeTeachingMode(application.mode);

      if (!linkedTeacher) {
        const created = await Teacher.create(
          [
            {
              user: targetUser._id,
              subject: application.subject,
              experience: application.experience || "",
              qualification: application.qualification || "",
              studentLevel: application.studentLevel || "",
              mode: normalizedMode,
              availability: application.availability || [],
              timeSlot: application.timeSlot || [],
              city: application.city || "",
              bio: application.bio || "",
              profileCompleted: true,
              isPublished: false, // Explicit publication control remains separate!
            },
          ],
          { session }
        );
        linkedTeacher = created[0];
      } else {
        // Update profile with details from approved application
        if (!linkedTeacher.subject) linkedTeacher.subject = application.subject;
        if (!linkedTeacher.experience) linkedTeacher.experience = application.experience;
        if (!linkedTeacher.qualification) linkedTeacher.qualification = application.qualification;
        if (!linkedTeacher.studentLevel) linkedTeacher.studentLevel = application.studentLevel;
        if (!linkedTeacher.mode) linkedTeacher.mode = normalizedMode;
        if (!linkedTeacher.availability || linkedTeacher.availability.length === 0) {
          linkedTeacher.availability = application.availability;
        }
        if (!linkedTeacher.timeSlot || linkedTeacher.timeSlot.length === 0) {
          linkedTeacher.timeSlot = application.timeSlot;
        }
        if (!linkedTeacher.city) linkedTeacher.city = application.city;
        if (!linkedTeacher.bio) linkedTeacher.bio = application.bio;
        await linkedTeacher.save({ session });
      }

      application.teacher = linkedTeacher._id;
    }

    await application.save({ session });
    await session.commitTransaction();
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }

  // Send status update email to applicant
  try {
    if (status === "approved") {
      await sendEmail({
        to: application.email,
        subject: "🎉 Your Tutor Application Has Been Approved!",
        html: `
          <h2>Congratulations ${application.fullName}!</h2>
          <p>Your application to teach at <strong>Inquisitive Mind Academy</strong> has been approved.</p>
          <p>Our academic coordinator will reach out regarding onboarding and your teacher profile details.</p>
          <br/>
          <p>Best regards,<br/>Inquisitive Mind Academy Team</p>
        `,
      });
    } else if (status === "info_requested") {
      await sendEmail({
        to: application.email,
        subject: "Action Required: Information Requested for Your Tutor Application",
        html: `
          <h2>Hello ${application.fullName},</h2>
          <p>Thank you for applying to Inquisitive Mind Academy. We are reviewing your application and require additional details:</p>
          <blockquote style="background:#f8f9fa;padding:12px;border-left:4px solid #facc15;">
            ${infoMessage || "Please reply with your updated qualifications and availability details."}
          </blockquote>
          <p>Please reply to this email or contact us at inquisitivemindacademy@gmail.com.</p>
        `,
      });
    } else if (status === "rejected") {
      await sendEmail({
        to: application.email,
        subject: "Update Regarding Your Tutor Application",
        html: `
          <h2>Hello ${application.fullName},</h2>
          <p>Thank you for your interest in teaching at Inquisitive Mind Academy. After reviewing our current requirements, we are unable to proceed with your application at this time.</p>
          ${rejectionReason ? `<p><strong>Feedback:</strong> ${rejectionReason}</p>` : ""}
          <p>We appreciate your time and wish you the best in your teaching journey.</p>
        `,
      });
    }
  } catch (emailErr) {
    console.error("Status update email failed:", emailErr.message);
  }

  return res.status(200).json({
    success: true,
    message: `Application status updated to ${status}.`,
    application,
    teacher: linkedTeacher,
  });
});

/**
 * PATCH /api/admin/teacher/:id/publish
 * Explicitly publish a tutor profile to the public directory.
 */
const publishTeacherProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid teacher ID." });
  }

  const teacher = await Teacher.findOne({ _id: id, isDeleted: false }).populate("user");

  if (!teacher) {
    return res.status(404).json({ success: false, message: "Teacher profile not found." });
  }

  if (!teacher.user || teacher.user.approvalStatus !== "approved" || teacher.user.status === "blocked") {
    return res.status(400).json({
      success: false,
      message: "Only approved, active teacher accounts can have their public profiles published.",
    });
  }

  teacher.isPublished = true;
  teacher.publishedAt = new Date();
  teacher.publishedBy = req.user._id;

  if (req.body.headline) teacher.headline = req.body.headline.trim();
  if (req.body.allowedPublicFields && Array.isArray(req.body.allowedPublicFields)) {
    teacher.allowedPublicFields = req.body.allowedPublicFields;
  }
  if (req.body.hourlyRate) {
    teacher.hourlyRate = {
      min: Number(req.body.hourlyRate.min) || 0,
      max: Number(req.body.hourlyRate.max) || 0,
      currency: req.body.hourlyRate.currency || "INR",
    };
  }

  await teacher.save();

  return res.status(200).json({
    success: true,
    message: "Tutor profile published successfully.",
    teacher,
  });
});

/**
 * PATCH /api/admin/teacher/:id/unpublish
 * Immediately unpublish a tutor profile from public results and matching pool.
 */
const unpublishTeacherProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid teacher ID." });
  }

  const teacher = await Teacher.findOne({ _id: id, isDeleted: false });

  if (!teacher) {
    return res.status(404).json({ success: false, message: "Teacher profile not found." });
  }

  teacher.isPublished = false;
  await teacher.save();

  return res.status(200).json({
    success: true,
    message: "Tutor profile unpublished from the public directory.",
    teacher,
  });
});

/**
 * PATCH /api/admin/teacher/:id/public-settings
 * Update public settings such as allowed fields, headline, rates.
 */
const updateTeacherPublicSettings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { allowedPublicFields, headline, hourlyRate, rating, reviewsCount } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid teacher ID." });
  }

  const teacher = await Teacher.findOne({ _id: id, isDeleted: false });

  if (!teacher) {
    return res.status(404).json({ success: false, message: "Teacher not found." });
  }

  if (allowedPublicFields && Array.isArray(allowedPublicFields)) {
    teacher.allowedPublicFields = allowedPublicFields;
  }

  if (headline !== undefined) {
    teacher.headline = (headline || "").trim();
  }

  if (hourlyRate) {
    teacher.hourlyRate = {
      min: Number(hourlyRate.min) || 0,
      max: Number(hourlyRate.max) || 0,
      currency: hourlyRate.currency || "INR",
    };
  }

  if (rating !== undefined && !isNaN(rating)) {
    teacher.rating = Math.min(5, Math.max(1, Number(rating)));
  }

  if (reviewsCount !== undefined && !isNaN(reviewsCount)) {
    teacher.reviewsCount = Math.max(0, Number(reviewsCount));
  }

  await teacher.save();

  return res.status(200).json({
    success: true,
    message: "Teacher public profile settings updated.",
    teacher,
  });
});


/**
 * DELETE /api/admin/tutor-application/:id
 * Safely soft-deletes a tutor application.
 */
const deleteTutorApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid application ID." });
  }

  const application = await TutorApplication.findOne({ _id: id, isDeleted: false });

  if (!application) {
    return res.status(404).json({ success: false, message: "Application not found." });
  }

  application.isDeleted = true;
  application.deletedAt = new Date();
  application.deletedBy = req.user._id;
  await application.save();

  // If there was an unapproved pending user created exclusively for this application
  if (application.user && application.status === "pending") {
    const linkedUser = await User.findOne({
      _id: application.user,
      approvalStatus: "pending",
      isDeleted: false,
    });
    if (linkedUser) {
      linkedUser.isDeleted = true;
      linkedUser.deletedAt = new Date();
      linkedUser.deletedBy = req.user._id;
      await linkedUser.save();
    }
  }

  return res.status(200).json({
    success: true,
    message: "Tutor application deleted successfully.",
  });
});

module.exports = {
  getTutorApplications,
  getTutorApplicationById,
  reviewTutorApplication,
  publishTeacherProfile,
  unpublishTeacherProfile,
  updateTeacherPublicSettings,
  deleteTutorApplication,
};

