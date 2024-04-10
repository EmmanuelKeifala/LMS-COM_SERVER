import {CatchAsyncErrors} from '../middleware/catchAsyncErrors';
import {Request, Response, NextFunction} from 'express';
import {transporter} from '../utils/sendMail';
import ErrorHandler from '../utils/ErrorHandler';
import {PrismaClient} from '@prisma/client';
import axios from 'axios';

const db = new PrismaClient();

async function sendEmailBatch(
  emails: any[],
  subject: string,
  messageBody: string,
) {
  const emailPromises = emails.map(async (user: any) => {
    try {
      await transporter.sendMail({
        from: '"meyoneducation" <meyoneducationhub@gmail.com>',
        to: user.email,
        subject: subject,
        html: `
          <p>Dear ${user.name},</p>
          ${messageBody}
          <p><strong>Best regards,</p>
          <p><em>meyoneducation Team</em></p>`,
      });
    } catch (error: any) {
      throw new ErrorHandler(error.message, 400);
    }
  });

  await Promise.all(emailPromises);
}

export const sendEmails = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {subject, messageBody, userCategory} = req.body;

      // Check if required fields are provided
      if (!subject || !messageBody || !userCategory) {
        throw new ErrorHandler('Please provide all required fields', 400);
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

      // Function to push user details into userData array
      const pushUserDetails = (user: any) => {
        userData.push({
          name: user?.first_name || 'Student',
          email: user?.email_addresses[0]?.email_address || null,
        });
      };

      let userIDsToCheck: string[] = [];

      // Fetch user IDs to check based on userCategory
      if (
        userCategory === 'courseNotCompleted' ||
        userCategory === 'noCourse'
      ) {
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
        await sendEmailBatch(batch, subject, messageBody);

        // Introduce a delay between batches
        if (i + batchSize < userData.length) {
          await new Promise(resolve =>
            setTimeout(resolve, delayBetweenBatches),
          );
        }
      }

      res.status(200).json({success: true});
    } catch (error) {
      return next(error);
    }
  },
);
