const mongoose = require("mongoose");

const tutorApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    experience: {
      type: String,
      trim: true,
      default: "",
    },

    studentLevel: {
      type: String,
      trim: true,
      default: "",
    },

    mode: {
      type: String,
      trim: true,
      default: "",
    },

    availability: {
      type: [String],
      default: [],
    },

    timeSlot: {
      type: [String],
      default: [],
    },

    qualification: {
      type: String,
      trim: true,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "info_requested"],
      default: "pending",
      index: true,
    },

    reviewNotes: [
      {
        note: { type: String, required: true, trim: true },
        admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    infoRequestedMessage: {
      type: String,
      default: "",
      trim: true,
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    source: {
      type: String,
      default: "become-a-tutor-form",
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful index for quick search
tutorApplicationSchema.index({ email: 1, status: 1 });
tutorApplicationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("TutorApplication", tutorApplicationSchema);
