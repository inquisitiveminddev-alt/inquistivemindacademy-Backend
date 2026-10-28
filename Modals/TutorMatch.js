const mongoose = require("mongoose");

const tutorMatchSchema = new mongoose.Schema(
  {
    requirement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentRequirement",
      required: true,
      index: true,
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    reasons: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: [
        "suggested",
        "shortlisted",
        "recommended",
        "contacted",
        "accepted",
        "rejected",
      ],
      default: "suggested",
      index: true,
    },

    adminNotes: {
      type: String,
      trim: true,
      default: "",
    },

    shortlistedAt: {
      type: Date,
      default: null,
    },

    recommendedAt: {
      type: Date,
      default: null,
    },

    outcomeAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate match records for the same requirement and teacher
tutorMatchSchema.index({ requirement: 1, teacher: 1 }, { unique: true });
tutorMatchSchema.index({ requirement: 1, status: 1 });

module.exports = mongoose.model("TutorMatch", tutorMatchSchema);
