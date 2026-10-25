
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
      enum: ["male", "female", "other"],
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
      enum: [
        "Less than 1 Year",
        "1 - 3 Years",
        "3 - 5 Years",
        "5+ Years",
        "",
      ],
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
      enum: [
        "Online Classes",
        "Offline Classes",
        "Hybrid Teaching",
        "",
      ],
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
      enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      default: [],
    },

    timeSlot: {
      type: [String],
      enum: [
        "6:00 AM - 9:00 AM",
        "9:00 AM - 12:00 PM",
        "12:00 PM - 3:00 PM",
        "3:00 PM - 6:00 PM",
        "6:00 PM - 9:00 PM",
        "9:00 PM - 11:00 PM",
      ],
      default: [],
    },

    profileCompleted: {
      type: Boolean,
      default: false,
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
