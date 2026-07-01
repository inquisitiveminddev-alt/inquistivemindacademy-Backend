const Batch = require("../Modals/Batches");

const Course = require("../Modals/Courses");
const asyncHandler = require("../Utils/asyncHandler");
const createBatch = asyncHandler(async (req, res) => {
  const course = await Course.findOne({
     name: req.body.name,
   _id: req.params.courseId,
   isDeleted:false
  });
  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found.",
    });
  }

  const batch = await Batch.create({
    ...req.body,
    course: course._id,
    createdBy:req.user._id
  });

  course.batches.push(batch._id);
  await course.save();

  res.status(201).json({
    success: true,
    message: "Batch created successfully.",
    batch,
  });
});
const getBatches = asyncHandler(async (req, res) => {

 
const course = await Course.findOne({
  slug: req.params.slug,
  isDeleted: false,
});

if (!course) {
  return res.status(404).json({
    success: false,
    message: "Course not found.",
  });
}
  const batches = await Batch.find({
    course:course._id,
     isDeleted:false
  })
    .populate("students")
    .populate("course","title")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    count: batches.length,
    batches,
  });
});
const getBatchById = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
   _id: req.params.batchId,
    isDeleted:false
  })
    .populate("course")
    .populate("students")
    .populate("trainers")

  if (!batch) {
    return res.status(404).json({
      success: false,
      message: "Batch not found.",
    });
  }

  res.status(200).json({
    success: true,
    batch,
  });
});
const updateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOneAndUpdate({
   _id: req.params.batchId,
    isDeleted:false
  },
    {
      $set: req.body,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!batch) {
    return res.status(404).json({
      success: false,
      message: "Batch not found.",
    });
  }

  res.status(200).json({
    success: true,
    message: "Batch updated successfully.",
    batch,
  });
});
const deleteBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    _id: req.params.batchId,
    isDeleted: false,
  });

  if (!batch) {
    return res.status(404).json({
      success: false,
      message: "Batch not found.",
    });
  }

  batch.isDeleted = true;
  batch.deletedAt = new Date();
  batch.deletedBy = req.user._id;

  await batch.save();

  // Optional: Remove the batch from the course
  await Course.findByIdAndUpdate(batch.course, {
    $pull: {
      batches: batch._id,
    },
  });

  res.status(200).json({
    success: true,
    message: "Batch deleted successfully.",
  });
});


const getBatchStudents = asyncHandler(
  async (req, res) => {
    const batch = await Batch.findOne({
     _id: req.params.batchId,
     isDeleted:false
    }).populate({
      path: "students",
      populate: {
        path: "user",
        select:
          "fullName email phone profileImage",
      },
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    res.status(200).json({
      success: true,
      count: batch.students.length,
      students: batch.students,
    });
  }
);


module.exports={createBatch,updateBatch,deleteBatch,getBatchById,getBatches,getBatchStudents}