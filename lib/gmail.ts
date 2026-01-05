import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import { JSXElementConstructor, ReactElement } from "react";

// Gmail SMTP transporter
const transporter = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  : null;

export const sendEmailViaGmail = async ({
  to,
  subject,
  react,
  from,
}: {
  to: string;
  subject: string;
  react: ReactElement<any, string | JSXElementConstructor<any>>;
  from?: string;
}) => {
  if (!transporter) {
    console.log("Gmail not configured, skipping email to:", to);
    return null;
  }

  const html = await render(react);
  const fromAddress = from ?? `Doc <${process.env.GMAIL_USER}>`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });
    console.log("Email sent via Gmail:", info.messageId);
    return info;
  } catch (error) {
    console.error("Gmail send error:", error);
    throw error;
  }
};
