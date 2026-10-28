const asyncHandler = require("../Utils/asyncHandler");
const bcrypt = require("bcryptjs");
const sendEmail = require("../Utils/sendEmail");
const StudentRequirement = require("../Modals/StudentRequirement");
const TutorApplication = require("../Modals/TutorApplication");
const User = require("../Modals/User");
const Teacher = require("../Modals/Teacher");

/**
 * Generate a clean, unique human-readable reference code.
 */
function generateReferenceCode() {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REQ-${dateStr}-${randomSuffix}`;
}

/**
 * POST /api/leads/students/save
 * Saves student tutor requirement to MongoDB, sends email notification to admin. Fully server-based.
 */
const saveStudentLead = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    email,
    goal,
    subject,
    language,
    level,
    availability = [],
    timeSlot = [],
    tutor,
    mode,
    city = "",
    budget,
  } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and phone number are required.",
    });
  }

  const primarySubject = subject || language || "General Subject";
  const primaryMode = mode || tutor || "Online Classes";

  // Check if authenticated
  let linkedUserId = null;
  if (req.user && req.user._id) {
    linkedUserId = req.user._id;
  }

  // Create persistent record in MongoDB
  const referenceCode = generateReferenceCode();
  const requirement = await StudentRequirement.create({
    referenceCode,
    user: linkedUserId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    city: city.trim(),
    goal: goal || "",
    subject: primarySubject,
    level: level || "",
    mode: primaryMode,
    availability: Array.isArray(availability) ? availability : [],
    timeSlot: Array.isArray(timeSlot) ? timeSlot : [],
    budget: budget || { min: 0, max: 0, preference: "" },
    status: "open",
  });

  // Admin notification email
  try {
    const availStr = Array.isArray(availability) ? availability.join(", ") : "";
    const slotStr = Array.isArray(timeSlot) ? timeSlot.join(", ") : "";

    sendEmail({
      to: ["sachinsingla1995@gmail.com", "inquisitivemindacademy@gmail.com"],
      subject: `🎓 New Student Requirement: ${primarySubject} [${referenceCode}]`,
      html: `
        <h2>New Student Requirement Received</h2>
        <p><strong>Reference Code:</strong> ${referenceCode}</p>
        <table border="1" cellpadding="8" cellspacing="0">
          <tr><td><b>Name</b></td><td>${name}</td></tr>
          <tr><td><b>Phone</b></td><td>${phone}</td></tr>
          <tr><td><b>Email</b></td><td>${email}</td></tr>
          <tr><td><b>Goal</b></td><td>${goal || "N/A"}</td></tr>
          <tr><td><b>Subject</b></td><td>${primarySubject}</td></tr>
          <tr><td><b>Level</b></td><td>${level || "N/A"}</td></tr>
          <tr><td><b>Mode</b></td><td>${primaryMode}</td></tr>
          <tr><td><b>Availability</b></td><td>${availStr || "Flexible"}</td></tr>
          <tr><td><b>Preferred Time</b></td><td>${slotStr || "Flexible"}</td></tr>
        </table>
        <p><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
      `,
    });
  } catch (emailErr) {
    console.error("Email notification failed for student lead:", emailErr.message);
  }

  return res.status(201).json({
    success: true,
    message: "Tutor requirement submitted successfully.",
    referenceCode: requirement.referenceCode,
    requirementId: requirement._id,
  });
});

/**
 * POST /api/leads/teacher/save
 * Saves tutor application to MongoDB, links user if exists, sends email notification to admin. Fully server-based.
 */
const saveTeacherLead = asyncHandler(async (req, res) => {
  const {
    name,
    fullName,
    email,
    phone,
    city = "",
    subject,
    experience,
    studentLevel,
    mode,
    availability = [],
    timeSlot = [],
    qualifications,
    qualification,
    bio = "",
  } = req.body;

  const applicantName = fullName || name;
  const applicantQual = qualification || qualifications || "";

  if (!applicantName || !email || !phone || !subject) {
    return res.status(400).json({
      success: false,
      message: "Name, email, phone, and subject are required.",
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Determine user linking
  let linkedUserId = null;
  let linkedTeacherId = null;

  if (req.user && req.user._id) {
    linkedUserId = req.user._id;
    const existingTeacher = await Teacher.findOne({
      user: req.user._id,
      isDeleted: false,
    });
    if (existingTeacher) {
      linkedTeacherId = existingTeacher._id;
    }
  } else {
    // Check if an existing User exists with this email
    const existingUser = await User.findOne({
      email: cleanEmail,
      isDeleted: false,
    });
    if (existingUser) {
      linkedUserId = existingUser._id;
      const existingTeacher = await Teacher.findOne({
        user: existingUser._id,
        isDeleted: false,
      });
      if (existingTeacher) {
        linkedTeacherId = existingTeacher._id;
      }
    } else if (req.body.password && req.body.password.length >= 8) {
      // Create user account upfront with password chosen in become-a-tutor form
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const newUser = await User.create({
        fullName: applicantName.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        password: hashedPassword,
        role: "teacher",
        approvalStatus: "pending",
        status: "active",
        emailVerified: true,
      });
      linkedUserId = newUser._id;
    }
  }

  // Prevent spamming active pending applications for same email
  const existingPendingApp = await TutorApplication.findOne({
    email: cleanEmail,
    status: { $in: ["pending", "under_review"] },
    isDeleted: false,
  });

  if (existingPendingApp) {
    return res.status(200).json({
      success: true,
      message:
        "You already have an active tutor application under review. Our team will contact you soon.",
      applicationId: existingPendingApp._id,
    });
  }

  // Create persistent record in MongoDB
  const application = await TutorApplication.create({
    user: linkedUserId,
    teacher: linkedTeacherId,
    fullName: applicantName.trim(),
    email: cleanEmail,
    phone: phone.trim(),
    city: city.trim(),
    subject: subject.trim(),
    experience: experience || "",
    studentLevel: studentLevel || "",
    mode: mode || "",
    availability: Array.isArray(availability) ? availability : [],
    timeSlot: Array.isArray(timeSlot) ? timeSlot : [],
    qualification: applicantQual.trim(),
    bio: bio.trim(),
    status: "pending",
  });

  // Admin notification email
  try {
    const availStr = Array.isArray(availability) ? availability.join(", ") : "";
    const slotStr = Array.isArray(timeSlot) ? timeSlot.join(", ") : "";

    sendEmail({
      to: ["sachinsingla1995@gmail.com", "inquisitivemindacademy@gmail.com"],
      subject: `👨‍🏫 New Tutor Application: ${applicantName} (${subject})`,
      html: `
        <h2>New Tutor Application Received</h2>
        <table border="1" cellpadding="8" cellspacing="0">
          <tr><td><b>Name</b></td><td>${applicantName}</td></tr>
          <tr><td><b>Email</b></td><td>${cleanEmail}</td></tr>
          <tr><td><b>Phone</b></td><td>${phone}</td></tr>
          <tr><td><b>City</b></td><td>${city || "N/A"}</td></tr>
          <tr><td><b>Subject</b></td><td>${subject}</td></tr>
          <tr><td><b>Experience</b></td><td>${experience || "N/A"}</td></tr>
          <tr><td><b>Student Level</b></td><td>${studentLevel || "N/A"}</td></tr>
          <tr><td><b>Mode</b></td><td>${mode || "N/A"}</td></tr>
          <tr><td><b>Availability</b></td><td>${availStr || "Flexible"}</td></tr>
          <tr><td><b>Preferred Time</b></td><td>${slotStr || "Flexible"}</td></tr>
          <tr><td><b>Qualifications</b></td><td>${applicantQual || "N/A"}</td></tr>
        </table>
        <p><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
      `,
    });
  } catch (emailErr) {
    console.error("Email notification failed for teacher lead:", emailErr.message);
  }

  return res.status(201).json({
    success: true,
    message: "Tutor application submitted successfully. We will review your details.",
    applicationId: application._id,
  });
});

module.exports = {
  saveStudentLead,
  saveTeacherLead,
};
