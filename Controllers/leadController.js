const sheets = require("../Config/googleSheets");
const asyncHandler = require("../Utils/asyncHandler");
const sendEmail=require("../Utils/sendEmail");
const saveStudentLead =asyncHandler(async (req, res) => {

    const { name,	phone,	email,	goal,	subject,	language,	level,		availability,	timeSlot } = req.body;

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:E", // Change "Sheet1" if your sheet has a different name
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
          name,	phone,	email,	goal,	subject,	language,	level,	availability.join(","),	timeSlot.join(','),
        new Date().toLocaleString(),
          ],
        ],
      },
    });
    await sendEmail({
  to: ["sachinsingla1995@gmail.com","inquisitivemindacademy@gmail.com"],
  subject: "🎓 New Student Lead Received",
  html: `
    <h2>New Student Lead</h2>

    <table border="1" cellpadding="8" cellspacing="0">
      <tr><td><b>Name</b></td><td>${name}</td></tr>
      <tr><td><b>Phone</b></td><td>${phone}</td></tr>
      <tr><td><b>Email</b></td><td>${email}</td></tr>
      <tr><td><b>Goal</b></td><td>${goal}</td></tr>
      <tr><td><b>Subject</b></td><td>${subject}</td></tr>
      <tr><td><b>Language</b></td><td>${language}</td></tr>
      <tr><td><b>Level</b></td><td>${level}</td></tr>
      <tr><td><b>Availability</b></td><td>${availability.join(", ")}</td></tr>
      <tr><td><b>Preferred Time</b></td><td>${timeSlot.join(", ")}</td></tr>
    </table>

    <p><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
  `,
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
          name,	email,	phone,	subject,	experience,	studentLevel,	mode,availability.join(','),	timeSlot.join(','),	qualifications,
        new Date().toLocaleString(),
          ],
        ],
      },
    });

    await sendEmail({
  to: ["sachinsingla1995@gmail.com","inquisitivemindacademy@gmail.com"],
  subject: "👨‍🏫 New Teacher Application Received",
  html: `
    <h2>New Teacher Application</h2>

    <table border="1" cellpadding="8" cellspacing="0">
      <tr><td><b>Name</b></td><td>${name}</td></tr>
      <tr><td><b>Email</b></td><td>${email}</td></tr>
      <tr><td><b>Phone</b></td><td>${phone}</td></tr>
      <tr><td><b>Subject</b></td><td>${subject}</td></tr>
      <tr><td><b>Experience</b></td><td>${experience}</td></tr>
      <tr><td><b>Student Level</b></td><td>${studentLevel}</td></tr>
      <tr><td><b>Mode</b></td><td>${mode}</td></tr>
      <tr><td><b>Availability</b></td><td>${availability.join(", ")}</td></tr>
      <tr><td><b>Preferred Time</b></td><td>${timeSlot.join(", ")}</td></tr>
      <tr><td><b>Qualifications</b></td><td>${qualifications}</td></tr>
    </table>

    <p><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
  `,
});

    res.status(200).json({
      success: true,
      message: "Lead saved successfully",
    });

  
})


module.exports = { saveStudentLead ,saveTeacherLead};