const Course = require("../Modals/Courses");
const Batch = require("../Modals/Batches");
const asyncHandler = require("../Utils/asyncHandler");
const slugify = require("slugify");
const generateUniqueSlug = require("../Utils/generateUniqueSlug");
const uploadToCloudinary = require("../Utils/Cloudinary");
const cloudinary = require("../Config/cloudinary");
const createCourse = asyncHandler(
  async (req, res) => {
    let thumbnail = {
      public_id: "",
      url: "",
    };

    if (req.file) {
      const result =
        await uploadToCloudinary(
           req.file.buffer,
          "courses"
        );

      thumbnail = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    }

    const slug =
      await generateUniqueSlug(
        req.body.title
      );

    const course = await Course.create({
      title: req.body.title,
      slug,
      description: req.body.description,
      shortDescription:
        req.body.shortDescription,
      price: req.body.price,
      durationInMonths:
        req.body.durationInMonths,
      level: req.body.level,
      status: req.body.status,

      thumbnail,

      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message:"Course Added Successfully",
      course,
    });
  }
);



const getCourses = asyncHandler(async (req, res) => {
 const courses = await Course.find({
  isDeleted: false,
}).populate("createdBy", "fullName email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: courses.length,
    courses,
  });
});
const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findOne({
   _id: req.params.courseId,
  isDeleted:false
  })
    .populate("createdBy", "fullName email")
    .populate("batches");

  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found.",
    });
  }

  res.status(200).json({
    success: true,
    course,
  });
});
const updateCourse = asyncHandler(async (req, res) => {
  console.log(req.body)
  const course = await Course.findOne({
    _id: req.params.courseId,
    isDeleted: false,
  });

  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found.",
    });
  }

  const updateData = {
    ...req.body,
  };

  if (req.body.title) {
    updateData.slug = await generateUniqueSlug(
      req.body.title,
      req.params.courseId
    );
  }

  // Replace thumbnail only if a new image is uploaded
  if (req.file) {
    // Delete old image from Cloudinary
    if (course.thumbnail?.public_id) {
      await cloudinary.uploader.destroy(course.thumbnail.public_id);
    }

    // Upload new image
    const result = await uploadToCloudinary(
      req.file.buffer,
      "courses",
    );

    updateData.thumbnail = {
      public_id: result.public_id,
      url: result.secure_url,
    };
  }

  const updatedCourse = await Course.findByIdAndUpdate(
    course._id,
    {
      $set: updateData,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: "Course updated successfully.",
    course: updatedCourse,
  });
});
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findOne({
    _id: req.params.courseId,
    isDeleted: false,
  });

  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found.",
    });
  }

  course.isDeleted = true;
  course.deletedAt = new Date();
  course.deletedBy = req.user._id;

  await course.save();

  await Batch.updateMany(
  {
    course: course._id,
    isDeleted: false,
  },
  {
    $set: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user._id,
    },
  }
);
  res.status(200).json({
    success: true,
    message: "Course deleted successfully.",
  });
});
const publishCourse = asyncHandler(async (req, res) => {
  const course = await Course.findOneAndUpdate({
   _id: req.params.courseId,
   isDeleted:false
   }, {
      status: "published",
    },
    {
      new: true,
    }
  );

  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found.",
    });
  }

  res.status(200).json({
    success: true,
    message: "Course published successfully.",
    course,
  });
});
const archiveCourse = asyncHandler(async (req, res) => {
  const course = await Course.findOneAndUpdate({
   _id: req.params.courseId,
    isDeleted:false
   }, {
      status: "archived",
    },
    {
      new: true,
    }
  );

  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found.",
    });
  }

  res.status(200).json({
    success: true,
    message: "Course archived successfully.",
    course,
  });
});
module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  publishCourse,
  archiveCourse,
};