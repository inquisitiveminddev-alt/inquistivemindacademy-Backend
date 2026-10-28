const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Personal details specific to the teacher profile
    city: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    gender: {
      type: String,
      default: "",
    },

    dateOfBirth: {
      type: Date,
    },

    // Teaching profile (French, German, English, Mathematics, Science, etc.)
    subject: {
      type: String,
      trim: true,
      default: "",
    },

    experience: {
      type: String,
      trim: true,
      default: "",
    },

    qualification: {
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

    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
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

    profileCompleted: {
      type: Boolean,
      default: false,
    },

    // Public directory & publication controls
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    headline: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    hourlyRate: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
    },

    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },

    reviewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    allowedPublicFields: {
      type: [String],
      default: [
        "fullName",
        "city",
        "subject",
        "experience",
        "qualification",
        "studentLevel",
        "mode",
        "bio",
        "availability",
        "timeSlot",
        "profileImage",
        "headline",
        "hourlyRate",
        "rating",
        "reviewsCount",
      ],
    },

    // Courses assigned to this teacher
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],

    // Soft delete
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

module.exports = mongoose.model("Teacher", teacherSchema);
