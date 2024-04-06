import {CatchAsyncErrors} from '../middleware/catchAsyncErrors';
import {Request, Response, NextFunction, raw} from 'express';
import ErrorHandler from '../utils/ErrorHandler';
import {PrismaClient} from '@prisma/client';
import axios from 'axios';

import clerkClient from '@clerk/clerk-sdk-node';

const db = new PrismaClient();
export const gameGeneration = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {userId, amount, topic, type} = await req.body;
      // Validation
      if (!userId || !amount || !topic || !type)
        return next(new ErrorHandler('Please provide all fields', 400));
      const user = await clerkClient.users.getUser(userId);
      if (!user) return next(new ErrorHandler('User not found', 400));

      const game = await db.game.create({
        data: {
          gameType: type,
          timeStarted: new Date(),
          userId: userId!!,
          topic,
          timeEned: null,
        },
      });

      await db.topicCount.upsert({
        where: {topic: topic},
        create: {
          topic: topic,
          count: 1,
        },
        update: {
          count: {
            increment: 1,
          },
        },
      });

      const {data} = await axios.post(
        `${process.env.NEXT_PUBLIC_APP_URL}/question`,
        // `http://localhost:3000/api/quiz/questions`,
        {
          amount,
          topic,
          type,
          userId,
        },
      );
      let manyData = [];
      if (type === 'mcq' || type === 'open_ended' || type === 'saq') {
        if (data.questions && Array.isArray(data.questions)) {
          manyData = data.questions.map((question: any) => {
            const questionData: any = {
              question: question.question,
              answer: question.answer,
              gameId: game.id,
              questionType: type,
            };

            if (type === 'mcq') {
              const options = [
                question.answer,
                question.option1,
                question.option2,
                question.option3,
              ];

              // Shuffle the options array using Fisher-Yates (Knuth) Shuffle Algorithm
              for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
              }

              questionData.options = JSON.stringify(options);
            }

            return questionData;
          });
        } else {
          throw new Error('Questions data is missing or not an array');
        }
      }

      await db.question.createMany({
        data: manyData,
      });
      res.status(200).json({success: true, gameId: game.id});
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);
