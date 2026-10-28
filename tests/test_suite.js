const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isSubjectMatch,
  evaluateMode,
  evaluateOverlap,
  evaluateLevel,
  scoreTutorCandidate,
  matchRequirement,
} = require("../Utils/matchingEngine");

const { serializePublicTeacher } = require("../Controllers/teacher");
const TutorApplication = require("../Modals/TutorApplication");
const StudentRequirement = require("../Modals/StudentRequirement");
const TutorMatch = require("../Modals/TutorMatch");
const Teacher = require("../Modals/Teacher");

test("Matching Engine — Subject Match", () => {
  assert.equal(isSubjectMatch("French", "French"), true);
  assert.equal(isSubjectMatch("Mathematics", "Math"), true);
  assert.equal(isSubjectMatch("German", "German Language"), true);
  assert.equal(isSubjectMatch("Science", "Physics"), true);
  assert.equal(isSubjectMatch("Physics", "Chemistry"), false);
  assert.equal(isSubjectMatch("", "French"), false);
});

test("Matching Engine — Mode Compatibility", () => {
  const onlineBoth = evaluateMode("Online Classes", "Online Classes");
  assert.equal(onlineBoth.compatible, true);
  assert.equal(onlineBoth.score, 25);

  const hybridReq = evaluateMode("Flexible / Hybrid", "Online Classes");
  assert.equal(hybridReq.compatible, true);

  const mismatch = evaluateMode("Offline / Home Tutoring", "Online Classes");
  assert.equal(mismatch.compatible, false);
});

test("Matching Engine — Schedule & Level Overlap", () => {
  const overlap = evaluateOverlap(["Mon", "Wed", "Fri"], ["Mon", "Fri", "Sat"]);
  assert.equal(overlap.overlapCount, 2);
  assert.equal(overlap.score > 0, true);

  const noOverlap = evaluateOverlap(["Mon"], ["Tue", "Wed"]);
  assert.equal(noOverlap.overlapCount, 0);
  assert.equal(noOverlap.score, 0);

  const level = evaluateLevel("Beginner A1", "Beginner");
  assert.equal(level.score >= 12, true);
});

test("Matching Engine — Candidate Eligibility & Scoring", () => {
  const requirement = {
    subject: "French",
    mode: "Online Classes",
    availability: ["Mon", "Wed"],
    timeSlot: ["6:00 PM - 9:00 PM"],
    level: "Beginner A1",
  };

  const eligibleTeacher = {
    _id: "teacher123",
    subject: "French",
    mode: "Online Classes",
    availability: ["Mon", "Wed", "Fri"],
    timeSlot: ["6:00 PM - 9:00 PM"],
    studentLevel: "Beginner A1",
    isDeleted: false,
    user: {
      _id: "user123",
      fullName: "Marie Dupont",
      status: "active",
      approvalStatus: "approved",
      isDeleted: false,
    },
  };

  const result = scoreTutorCandidate(requirement, eligibleTeacher);
  assert.equal(result.eligible, true);
  assert.equal(result.score >= 80, true);
  assert.equal(result.reasons.length > 0, true);

  // Inactive or blocked user is not eligible
  const blockedTeacher = {
    ...eligibleTeacher,
    user: { ...eligibleTeacher.user, status: "blocked" },
  };
  const blockedResult = scoreTutorCandidate(requirement, blockedTeacher);
  assert.equal(blockedResult.eligible, false);

  // Unapproved teacher is not eligible
  const unapprovedTeacher = {
    ...eligibleTeacher,
    user: { ...eligibleTeacher.user, approvalStatus: "pending" },
  };
  const unapprovedResult = scoreTutorCandidate(requirement, unapprovedTeacher);
  assert.equal(unapprovedResult.eligible, false);

  // Subject mismatch produces no match
  const wrongSubjectTeacher = {
    ...eligibleTeacher,
    subject: "Mathematics",
  };
  const wrongSubjectResult = scoreTutorCandidate(requirement, wrongSubjectTeacher);
  assert.equal(wrongSubjectResult.eligible, false);
});

test("Public Serializer — Strict allowlist and privacy", () => {
  const sensitiveTeacher = {
    _id: "t_456",
    city: "Delhi",
    subject: "German",
    experience: "3 - 5 Years",
    qualification: "C1 Certified",
    studentLevel: "High School (9-10)",
    mode: "Online Classes",
    bio: "Passionate German instructor",
    availability: ["Tue", "Thu"],
    timeSlot: ["9:00 AM - 12:00 PM"],
    headline: "Certified Goethe Instructor",
    hourlyRate: { min: 800, max: 1200, currency: "INR" },
    rating: 4.9,
    reviewsCount: 15,
    user: {
      _id: "u_789",
      fullName: "Ananya Sharma",
      email: "ananya.private@example.com",
      phone: "+91 9876543210",
      password: "HashedSecretPassword123!",
      loginAttempts: 0,
      profileImage: { url: "https://example.com/photo.jpg" },
    },
    allowedPublicFields: [
      "fullName",
      "city",
      "subject",
      "experience",
      "qualification",
      "mode",
      "headline",
      "rating",
    ],
  };

  const serialized = serializePublicTeacher(sensitiveTeacher);

  // Allowed public fields present
  assert.equal(serialized.id, "t_456");
  assert.equal(serialized.fullName, "Ananya Sharma");
  assert.equal(serialized.city, "Delhi");
  assert.equal(serialized.subject, "German");
  assert.equal(serialized.rating, 4.9);

  // Sensitive fields MUST NOT exist
  assert.equal(serialized.email, undefined);
  assert.equal(serialized.phone, undefined);
  assert.equal(serialized.password, undefined);
  assert.equal(serialized.loginAttempts, undefined);
  assert.equal(serialized.user, undefined);
});

test("Schema Defaults — Approval does not imply publication", () => {
  const defaultTeacher = new Teacher({
    user: "507f1f77bcf86cd799439011",
    subject: "Spanish",
  });

  // Critical verification: isPublished MUST default to false
  assert.equal(defaultTeacher.isPublished, false);
  assert.equal(defaultTeacher.publishedAt, null);
  assert.equal(defaultTeacher.publishedBy, null);
  assert.equal(defaultTeacher.allowedPublicFields.includes("fullName"), true);
});

test("Schema Defaults — TutorApplication review status", () => {
  const app = new TutorApplication({
    fullName: "John Doe",
    email: "john@example.com",
    subject: "French",
  });

  assert.equal(app.status, "pending");
  assert.equal(Array.isArray(app.reviewNotes), true);
});

test("Schema Defaults — StudentRequirement status and referenceCode", () => {
  const req = new StudentRequirement({
    referenceCode: "REQ-261028-TEST",
    name: "Jane Student",
    email: "jane@example.com",
    phone: "1234567890",
    subject: "Mathematics",
  });

  assert.equal(req.status, "open");
  assert.equal(req.referenceCode, "REQ-261028-TEST");
  assert.equal(Array.isArray(req.adminNotes), true);
});

test("Schema Defaults — TutorMatch unique compound index", () => {
  const match = new TutorMatch({
    requirement: "507f1f77bcf86cd799439012",
    teacher: "507f1f77bcf86cd799439013",
    user: "507f1f77bcf86cd799439014",
    score: 85,
    reasons: ["Direct subject match", "Mode compatible"],
  });

  assert.equal(match.status, "suggested");
  assert.equal(match.score, 85);
  assert.equal(match.reasons.length, 2);
});
