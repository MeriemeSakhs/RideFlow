const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_APP_PASSWORD) return null;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_APP_PASSWORD,
    },
  });
  return transporter;
};

// Throws if SMTP isn't configured or sending fails - callers should catch
// this and respond with a clear error rather than silently pretending the
// email went out.
const sendEmailChangeCode = async (toEmail, code) => {
  const t = getTransporter();
  if (!t) {
    throw new Error("Email sending is not configured (missing SMTP_USER/SMTP_APP_PASSWORD)");
  }

  await t.sendMail({
    from: `"RideFlow" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Confirm your new RideFlow email address",
    text: `Your RideFlow email verification code is ${code}. This code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto;">
        <p style="color:#172643; font-size:16px;">Confirm your new RideFlow email address by entering this code:</p>
        <p style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#172643; margin: 20px 0;">${code}</p>
        <p style="color:#666; font-size:13px;">This code expires in 10 minutes. If you didn't request this change, you can safely ignore this email.</p>
      </div>
    `,
  });
};

// Throws if SMTP isn't configured or sending fails - same contract as
// sendEmailChangeCode above; callers must catch it themselves.
const sendSignupVerificationCode = async (toEmail, fullName, code) => {
  const t = getTransporter();
  if (!t) {
    throw new Error("Email sending is not configured (missing SMTP_USER/SMTP_APP_PASSWORD)");
  }

  await t.sendMail({
    from: `"RideFlow" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Verify your RideFlow email",
    text: `Hello ${fullName},\n\nWelcome to RideFlow.\n\nUse the verification code below to verify your email address:\n\n${code}\n\nThis code expires in 10 minutes.\n\nIf you did not create this RideFlow account, you can ignore this email.\n\nRideFlow`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto;">
        <p style="color:#172643; font-size:16px;">Hello ${fullName},</p>
        <p style="color:#172643; font-size:16px;">Welcome to RideFlow.</p>
        <p style="color:#172643; font-size:16px;">Use the verification code below to verify your email address:</p>
        <p style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#172643; margin: 20px 0;">${code}</p>
        <p style="color:#666; font-size:13px;">This code expires in 10 minutes. If you did not create this RideFlow account, you can safely ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendEmailChangeCode, sendSignupVerificationCode };
