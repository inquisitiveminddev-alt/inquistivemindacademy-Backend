const mongoose = require("mongoose");

const studentRequirementSchema = new mongoose.Schema(
  {
    referenceCode: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    name: {
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
      required: true,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    goal: {
      type: String,
      trim: true,
      default: "",
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    level: {
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

    budget: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      preference: { type: String, default: "" },
    },

    status: {
      type: String,
      enum: ["open", "matched", "contacted", "converted", "closed", "cancelled"],
      default: "open",
      index: true,
    },

    adminNotes: [
      {
        note: { type: String, required: true, trim: true },
        admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastContactedAt: {
      type: Date,
      default: null,
    },

    source: {
      type: String,
      default: "find-tutor-form",
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

studentRequirementSchema.index({ status: 1, createdAt: -1 });
studentRequirementSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model("StudentRequirement", studentRequirementSchema);
