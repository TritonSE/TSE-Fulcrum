import nodemailer from "nodemailer";
import env from "../env";

import EmailModel from "../models/EmailModel";

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: 465,
  secure: true,
  auth: {
    user: env.EMAIL_USERNAME,
    pass: env.EMAIL_PASSWORD,
  }
});

async function sendEmail(recipient: string, subject: string, body: string) {
  body = body.trim() + "\n\n" + env.EMAIL_FOOTER;
  if (env.EMAIL_ENABLED) {
    try {
      await transporter.sendMail({
        to: recipient,
        subject,
        text: body,
      });
      return true;
    } catch (e) {
      console.error(e);
      await EmailModel.create({
        recipient, subject, message: body, sendError: `${e}${e instanceof Error ? "\n" + e.stack : ""}`
      });
      return false;
    }
  } else {
    console.log({ recipient, subject });
    console.log(body.replace(/^/gm, "> "));
    return true;
  }
}

export {
  sendEmail,
}
