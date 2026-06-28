const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  
  credentials: {
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({
    version:"v4",
    auth
})
module.exports=sheets