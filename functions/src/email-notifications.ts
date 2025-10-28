
import nodemailer from "nodemailer";

// Use process.env for environment variables in Firebase Functions v2
const email = process.env.ALERT_EMAIL_ADDRESS;
const password = process.env.ALERT_EMAIL_PASSWORD;

// Ensure the email service is only configured if credentials are provided
const transporter =
  email && password
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: email,
          pass: password,
        },
      })
    : null;

export const sendEmailNotification = async (subject: string, message: string) => {
  if (!transporter || !email) {
    console.warn("Email notifications are not configured. Skipping email send.");
    return;
  }
  
  try {
    await transporter.sendMail({
      from: `"Firebase Monitor" <${email}>`,
      to: email,
      subject,
      text: message,
    });
    console.log("✅ Email notification sent:", subject);
  } catch (error) {
    console.error("❌ Failed to send email notification:", error);
  }
};
