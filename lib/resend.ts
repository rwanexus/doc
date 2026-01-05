import { JSXElementConstructor, ReactElement } from "react";

import { render, toPlainText } from "@react-email/render";
import { Resend } from "resend";
import nodemailer from "nodemailer";

import prisma from "@/lib/prisma";
import { log, nanoid } from "@/lib/utils";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Gmail SMTP transporter (fallback)
const gmailTransporter = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  : null;

export const sendEmail = async ({
  to,
  subject,
  react,
  from,
  marketing,
  system,
  verify,
  test,
  cc,
  replyTo,
  scheduledAt,
  unsubscribeUrl,
}: {
  to: string;
  subject: string;
  react: ReactElement<any, string | JSXElementConstructor<any>>;
  from?: string;
  marketing?: boolean;
  system?: boolean;
  verify?: boolean;
  test?: boolean;
  cc?: string | string[];
  replyTo?: string;
  scheduledAt?: string;
  unsubscribeUrl?: string;
}) => {
  const html = await render(react);
  const plainText = toPlainText(html);

  // Use Resend if available
  if (resend) {
    const fromAddress =
      from ??
      (marketing
        ? "Doc <marc@updates.papermark.com>"
        : system
          ? "Doc <system@papermark.com>"
          : verify
            ? "Doc <system@verify.papermark.com>"
            : !!scheduledAt
              ? "Marc Seitz <marc@papermark.com>"
              : "Doc <marc@papermark.io>");

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: test ? "delivered@resend.dev" : to,
        cc: cc,
        replyTo: marketing ? "marc@papermark.com" : replyTo,
        subject,
        react,
        scheduledAt,
        text: plainText,
        headers: {
          "X-Entity-Ref-ID": nanoid(),
          ...(unsubscribeUrl ? { "List-Unsubscribe": unsubscribeUrl } : {}),
        },
      });

      if (error) {
        log({
          message: `Resend returned error when sending email: ${error.name} \n\n ${error.message}`,
          type: "error",
          mention: true,
        });
        throw error;
      }
      return data;
    } catch (exception) {
      log({
        message: `Unexpected error when sending email: ${exception}`,
        type: "error",
        mention: true,
      });
      throw exception;
    }
  }

  // Fallback to Gmail SMTP
  if (gmailTransporter) {
    const fromAddress = from ?? `Doc <${process.env.GMAIL_USER}>`;
    try {
      const info = await gmailTransporter.sendMail({
        from: fromAddress,
        to: test ? process.env.GMAIL_USER : to,
        cc: Array.isArray(cc) ? cc.join(", ") : cc,
        replyTo: replyTo,
        subject,
        html,
        text: plainText,
      });
      console.log("Email sent via Gmail:", info.messageId);
      return { id: info.messageId };
    } catch (error) {
      console.error("Gmail send error:", error);
      throw error;
    }
  }

  // No email service configured
  console.log("No email service configured, skipping email to:", to, "Subject:", subject);
  return null;
};

export const subscribe = async (email: string): Promise<void> => {
  // Skip subscription if no Resend (Gmail doesn't support mailing lists)
  if (!resend) {
    console.log("Resend not configured, skipping subscription for:", email);
    return;
  }

  const { data, error } = await resend.contacts.create({
    email,
  });

  if (error || !data?.id) {
    console.error("Failed to create contact:", error);
    return;
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.RESEND_MARKETING_SEGMENT_ID
  ) {
    await resend.contacts.segments.add({
      contactId: data.id,
      segmentId: process.env.RESEND_MARKETING_SEGMENT_ID as string,
    });
  }
};

export const unsubscribe = async (email: string): Promise<void> => {
  if (!resend) {
    console.log("Resend not configured, skipping unsubscribe for:", email);
    return;
  }

  if (!email) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true },
  });

  if (!user || !user.email) {
    return;
  }

  await resend.contacts.update({
    email: user.email,
    unsubscribed: true,
  });
};
