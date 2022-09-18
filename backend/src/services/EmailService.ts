import nodemailer from "nodemailer";

import env from "../env";

interface EmailMessage {
  recipient: string;
  subject: string;
  body: string;
}

class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: 465,
      secure: true,
      auth: {
        user: env.EMAIL_USERNAME,
        pass: env.EMAIL_PASSWORD,
      },
    });
  }

  async send({ recipient, subject, body }: EmailMessage): Promise<void> {
    body = body.trim() + "\n\n" + env.EMAIL_FOOTER;

    console.log(`Email starts here, recipient: ${recipient}, subject: ${subject}`);
    console.log(body.replace(/^/gm, "| "));
    console.log(`Email ends here`);

    if (!env.EMAIL_ENABLED) {
      console.log("Email not enabled; not sending");
      return;
    }

    // TODO: implement a dead-letter queue for emails that fail to send?

    try {
      await this.transporter.sendMail({
        to: recipient,
        subject,
        text: body,
      });
    } catch (e) {
      console.error(e);
    }
  }
}

export default new EmailService();
