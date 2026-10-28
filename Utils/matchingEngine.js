/**
 * Deterministic and explainable matching engine for Inquisitive Mind Academy.
 * Evaluates tutor candidates against a student requirement.
 */

function normalizeString(str) {
  return (str || "").toLowerCase().trim();
}

/**
 * Checks if two subjects match or overlap
 */
function isSubjectMatch(reqSubject, tutorSubject) {
  const r = normalizeString(reqSubject);
  const t = normalizeString(tutorSubject);

  if (!r || !t) return false;
  if (r === t) return true;
  if (r.includes(t) || t.includes(r)) return true;

  // Umbrella "Science" covers individual sciences
  if (r === "science" && ["physics", "chemistry", "biology"].includes(t)) return true;
  if (t === "science" && ["physics", "chemistry", "biology"].includes(r)) return true;

  // Specific aliases (same subject under different names)
  const aliases = {
    math: ["mathematics", "maths", "math"],
    english: ["english", "spoken english", "english language"],
    french: ["french", "français"],
    german: ["german", "deutsch"],
    spanish: ["spanish", "español"],
  };

  for (const [key, variants] of Object.entries(aliases)) {
    if (variants.includes(r) && variants.includes(t)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks teaching mode compatibility
 */
function evaluateMode(reqMode, tutorMode) {
  const r = normalizeString(reqMode);
  const t = normalizeString(tutorMode);

  if (!r || !t) {
    return { compatible: true, score: 12, reason: "Teaching mode not restricted" };
  }

  const isOnlineReq = r.includes("online") || r.includes("1-on-1");
  const isOfflineReq = r.includes("offline") || r.includes("home");
  const isHybridReq = r.includes("hybrid") || r.includes("flexible");

  const isOnlineTutor = t.includes("online") || t.includes("hybrid");
  const isOfflineTutor = t.includes("offline") || t.includes("home") || t.includes("hybrid");

  if (isHybridReq || t.includes("hybrid")) {
    return { compatible: true, score: 25, reason: "Compatible mode: Hybrid / Flexible teaching" };
  }

  if (isOnlineReq && isOnlineTutor) {
    return { compatible: true, score: 25, reason: "Compatible mode: Online classes" };
  }

  if (isOfflineReq && isOfflineTutor) {
    return { compatible: true, score: 25, reason: "Compatible mode: Offline / Home tutoring" };
  }

  return { compatible: false, score: 0, reason: null };
}

/**
 * Evaluates overlap between two string arrays (e.g. days or time slots)
 */
function evaluateOverlap(arr1 = [], arr2 = [], label = "Schedule") {
  const set1 = new Set((arr1 || []).map(normalizeString));
  const set2 = new Set((arr2 || []).map(normalizeString));

  if (set1.size === 0 || set2.size === 0) {
    return {
      overlapCount: 0,
      overlappingItems: [],
      score: 5,
      reason: `${label} flexible or open`,
    };
  }

  const common = [];
  for (const item of set1) {
    if (set2.has(item)) {
      common.push(item);
    }
  }

  if (common.length > 0) {
    return {
      overlapCount: common.length,
      overlappingItems: common,
      score: Math.min(10, 5 + common.length * 2),
      reason: `${label} overlap: ${common.slice(0, 3).join(", ")}`,
    };
  }

  return {
    overlapCount: 0,
    overlappingItems: [],
    score: 0,
    reason: null,
  };
}

/**
 * Evaluates student level compatibility
 */
function evaluateLevel(reqLevel, tutorLevel) {
  const r = normalizeString(reqLevel);
  const t = normalizeString(tutorLevel);

  if (!r || !t) {
    return { score: 8, reason: "Level open to all stages" };
  }

  if (r === t || r.includes(t) || t.includes(r)) {
    return { score: 15, reason: `Matches student level: ${tutorLevel}` };
  }

  // Cross-reference language levels
  const aLevels = ["a1", "a2", "beginner", "elementary"];
  const bLevels = ["b1", "b2", "intermediate", "upper intermediate"];
  const cLevels = ["c1", "c2", "advanced"];

  const matchesGroup = (levels) =>
    levels.some((l) => r.includes(l)) && levels.some((l) => t.includes(l));

  if (matchesGroup(aLevels) || matchesGroup(bLevels) || matchesGroup(cLevels)) {
    return { score: 12, reason: `Compatible language proficiency band` };
  }

  return { score: 5, reason: null };
}

/**
 * Scores a single tutor candidate against a requirement
 * Returns { eligible: boolean, score: number, reasons: string[] }
 */
function scoreTutorCandidate(requirement, teacher) {
  const user = teacher.user || {};

  // Hard eligibility checks
  if (teacher.isDeleted || user.isDeleted) {
    return { eligible: false, score: 0, reasons: [] };
  }

  if (user.status !== "active") {
    return { eligible: false, score: 0, reasons: [] };
  }

  if (user.approvalStatus !== "approved") {
    return { eligible: false, score: 0, reasons: [] };
  }

  const reasons = [];
  let totalScore = 0;

  // 1. Subject Match (40 points)
  if (!isSubjectMatch(requirement.subject, teacher.subject)) {
    // Primary subject mismatch -> not eligible
    return { eligible: false, score: 0, reasons: [] };
  }

  totalScore += 40;
  reasons.push(`Direct subject match: ${teacher.subject || requirement.subject}`);

  // 2. Mode Match (25 points)
  const modeResult = evaluateMode(requirement.mode, teacher.mode);
  if (!modeResult.compatible) {
    // Mode is incompatible -> not eligible
    return { eligible: false, score: 0, reasons: [] };
  }
  totalScore += modeResult.score;
  if (modeResult.reason) reasons.push(modeResult.reason);

  // 3. Schedule Overlap (20 points total: 10 for days, 10 for times)
  const daysResult = evaluateOverlap(requirement.availability, teacher.availability, "Day");
  totalScore += daysResult.score;
  if (daysResult.reason) reasons.push(daysResult.reason);

  const timesResult = evaluateOverlap(requirement.timeSlot, teacher.timeSlot, "Time slot");
  totalScore += timesResult.score;
  if (timesResult.reason) reasons.push(timesResult.reason);

  // 4. Level Compatibility (15 points)
  const levelResult = evaluateLevel(requirement.level, teacher.studentLevel);
  totalScore += levelResult.score;
  if (levelResult.reason) reasons.push(levelResult.reason);

  // 5. Offline Location compatibility check
  const isOffline =
    normalizeString(requirement.mode).includes("offline") ||
    normalizeString(requirement.mode).includes("home");
  if (isOffline && requirement.city && teacher.city) {
    if (normalizeString(requirement.city) === normalizeString(teacher.city)) {
      reasons.push(`Service area match: ${teacher.city}`);
    } else {
      totalScore = Math.max(20, totalScore - 15);
    }
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  return {
    eligible: true,
    score: finalScore,
    reasons,
  };
}

/**
 * Matches a student requirement against a list of teachers
 */
function matchRequirement(requirement, teachers) {
  const matches = [];

  for (const teacher of teachers) {
    const result = scoreTutorCandidate(requirement, teacher);
    if (result.eligible) {
      matches.push({
        teacher,
        user: teacher.user,
        score: result.score,
        reasons: result.reasons,
      });
    }
  }

  // Sort descending by score
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

module.exports = {
  isSubjectMatch,
  evaluateMode,
  evaluateOverlap,
  evaluateLevel,
  scoreTutorCandidate,
  matchRequirement,
};
