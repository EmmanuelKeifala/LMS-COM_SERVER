import {Request, Response, NextFunction} from 'express';
import {CatchAsyncErrors} from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import path from 'path';
import ejs from 'ejs';
import sendEJSEmail from '../utils/sendEjsMail';
import clerkClient from '@clerk/clerk-sdk-node';
export const blogNotification = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await req.body;

      const recipients = await clerkClient.users.getUserList({
        limit: 399,
      });
      const usersWithSubscriptions = recipients.filter(recipient => {
        return (
          recipient.privateMetadata && recipient.privateMetadata.subscription
        );
      });
      const data = {
        title: event.title,
        description: event.description,
        url: `https://meyoneducation.vercel.app/blog/post/${event.slug.current}`,
      };
      const html = await ejs.renderFile(
        path.join(__dirname, '../mails/blog-notification.ejs'),
        {data},
      );

      usersWithSubscriptions.map(async recipient => {
        try {
          await sendEJSEmail({
            email: recipient.emailAddresses[0].emailAddress,
            subject: 'Blog Post',
            template: 'blog-notification.ejs',
            data: {
              ...data,
              name: recipient.firstName,
              email: recipient.emailAddresses[0].emailAddress,
            },
          });
        } catch (error) {
          console.log(error);
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          usersWithSubscriptions,
          event,
        },
      });
    } catch (error) {
      return next(new ErrorHandler('internal sever error', 500));
    }
  },
);
