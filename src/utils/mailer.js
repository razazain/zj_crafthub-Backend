import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
} = process.env;

console.log("📧 Mailer Config:",  {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  EMAIL_FROM,
});

// ✅ Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ✅ Verify transporter on startup
transporter.verify()
  .then(() => console.log("✅ Mailer verified and ready to send emails"))
  .catch((err) => console.warn("⚠️ Mailer verify failed — check SMTP config:", err.message));

/**
 * sendMail
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text version
 * @param {string} [options.html] - HTML version
 * @param {Array} [options.attachments] - Optional attachments [{ filename, path }]
 */
export async function sendMail({ to, subject, text, html, attachments }) {
  if (!to || !subject || (!text && !html)) {
    throw new Error("Missing required fields for sending email (to, subject, text or html)");
  }

  const mailOptions = {
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
    throw err;
  }
}
