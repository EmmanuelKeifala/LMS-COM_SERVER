import {CatchAsyncErrors} from '../middleware/catchAsyncErrors';
import {Request, Response, NextFunction} from 'express';
import {transporter} from '../utils/sendMail';
import ErrorHandler from '../utils/ErrorHandler';
import {PrismaClient} from '@prisma/client';
import axios from 'axios';
const db = new PrismaClient();

async function sendEmailBatch(emails: any[], data: any) {
  console.log('data', data);
  const emailPromises = emails.map(async (user: any) => {
    try {
      await transporter.sendMail({
        from: '"meyoneducation" <meyoneducationhub@gmail.com>',
        to: user.email,
        subject: data.subject,
        html: `
        <p>Dear ${user.name},</p>
        ${data.messageBody}
        <p><strong>Best regards,<br />David Moses Ansumana</strong></p>
        <p><em>meyoneducation Team</em></p>`,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  });

  // Wait for all emails in the batch to be sent
  await Promise.all(emailPromises);
}

export const sendEmails = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {subject, messageBody, userCategory} = await req.body;
      if (!subject || !messageBody || !userCategory) {
        return next(
          new ErrorHandler('Please provide all required fields', 400),
        );
      }
      // Fetch users from the external API
      const response = await axios.get(
        `https://api.clerk.com/v1/users?limit=499`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
            Accept: 'application/json',
          },
        },
      );

      const userData: any[] = [];

      const pushUserDetails = (user: any) => {
        userData.push({
          name: user?.first_name || 'Student',
          email: user?.email_addresses[0]?.email_address || null,
        });
      };

      let userIDsToCheck: string[] = [];

      if (
        userCategory === 'courseNotCompleted' ||
        userCategory === 'noCourse'
      ) {
        // Fetch user IDs to check from the database
        userIDsToCheck = await db.userProgress
          .findMany({
            where: {isCompleted: false},
            select: {userId: true},
          })
          .then(users => users.map(user => user.userId));
      }

      // Process users based on userCategory
      response.data.forEach((user: any) => {
        if (
          !userCategory ||
          !user.public_metadata.userClass ||
          (userCategory === 'courseNotCompleted' &&
            !userIDsToCheck.includes(user.id))
        ) {
          pushUserDetails(user);
        }
      });

      // Set the batch size and delay between batches
      const batchSize = 50;
      const delayBetweenBatches = 5000;
      // Send emails in batches
      for (let i = 0; i < userData.length; i += batchSize) {
        const batch = userData.slice(i, i + batchSize);
        // Parallelize email sending within a batch
        const data = {
          messageBody,
          subject,
        };
        await Promise.all(batch.map(user => sendEmailBatch([user], data)));
        // Introduce a delay between batches
        if (i + batchSize < userData.length) {
          await new Promise(resolve =>
            setTimeout(resolve, delayBetweenBatches),
          );
        }
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);
function next(arg0: ErrorHandler) {
  throw new Error('Function not implemented.');
}
