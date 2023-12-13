import nodemailer from "nodemailer";

import env from "../env";

type EmailMessage = {
  recipient: string;
  subject: string;
  body: string;
};

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

  async send({ recipient, subject, body }: EmailMessage): Promise<boolean> {
    body = body.trim() + "\n\n" + env.EMAIL_FOOTER;

    console.log(`Email starts here, recipient: ${recipient}, subject: ${subject}`);
    console.log(body.replace(/^/gm, "| "));
    console.log(`Email ends here`);

    if (!env.EMAIL_ENABLED) {
      console.log("Email not enabled; not actually sending");
      return true;
    }

    // TODO: implement a dead-letter queue for emails that fail to send?

    try {
      await this.transporter.sendMail({
        to: recipient,
        subject,
        text: body,
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

export default new EmailService();
