const sheets = require("../Config/googleSheets");
const asyncHandler = require("../Utils/asyncHandler");

const saveStudentLead =asyncHandler(async (req, res) => {

    const { name,	phone,	email,	goal,	subject,	language,	level,		availability,	timeSlot } = req.body;

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:E", // Change "Sheet1" if your sheet has a different name
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
          name,	phone,	email,	goal,	subject,	language,	level,	availability.join(","),	timeSlot,
        new Date().toLocaleString(),
          ],
        ],
      },
    });

    res.status(200).json({
      success: true,
      message: "Lead saved successfully",
    });

  
})
const saveTeacherLead =asyncHandler(async (req, res) => {

    const { name,	email,	phone,	subject,	experience,	studentLevel,	mode,	availability,	timeSlot,	qualifications } = req.body;

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_TEACHER_ID,
      range: "Sheet1!A:E", // Change "Sheet1" if your sheet has a different name
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
          name,	email,	phone,	subject,	experience,	studentLevel,	mode,availability.join(','),	timeSlot,	qualifications,
        new Date().toLocaleString(),
          ],
        ],
      },
    });

    res.status(200).json({
      success: true,
      message: "Lead saved successfully",
    });

  
})


module.exports = { saveStudentLead ,saveTeacherLead};