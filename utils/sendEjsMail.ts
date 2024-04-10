/** @format */

// Package imports
import nodemailer, {Transporter} from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
require('dotenv').config();

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: {[key: string]: any};
}

const sendEJSEmail = async (options: EmailOptions): Promise<void> => {
  const transporter: Transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_PORT!),
    service: process.env.EMAIL_SERVICE!,
    auth: {
      user: process.env.SMTP_MAIL!,
      pass: process.env.SMTP_PASSWORD!,
    },
  });

  const {email, subject, template, data} = options;

  // Dynamic template path
  const templatePath = path.join(__dirname, '../mails', template);

  // Rendering the ejs
  const html: string = await ejs.renderFile(templatePath, {data});

  // Sending email
  const mailOptions = {
    from: process.env.SMTP_MAIL!,
    to: email,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEJSEmail;
