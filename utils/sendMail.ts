import nodemailer from 'nodemailer';
require('dotenv').config();

const transporter = nodemailer.createTransport({
  pool: true,
  host: process.env.EMAIL_HOST!,
  port: parseInt(process.env.EMAIL_PORT!),
  service: process.env.EMAIL_SERVICE!,
  maxMessages: Infinity,
  auth: {
    user: process.env.SMTP_MAIL!,
    pass: process.env.SMTP_PASSWORD!,
  },
});

export {transporter};
