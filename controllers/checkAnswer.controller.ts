import {CatchAsyncErrors} from '../middleware/catchAsyncErrors';
import {Request, Response, NextFunction, raw} from 'express';
import ErrorHandler from '../utils/ErrorHandler';
import {PrismaClient} from '@prisma/client';
import {compareTwoStrings} from 'string-similarity';

const db = new PrismaClient();

export const checkAnswer = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {questionId, userAnswer} = await req.body;
      // Validation
      if (!questionId || !userAnswer)
        return next(new ErrorHandler('Please provide all fields', 400));

      const question = await db.question.findUnique({
        where: {
          id: questionId,
        },
      });
      if (!question) {
        return next(new ErrorHandler('Question not found', 404));
      }

      await db.question.update({
        where: {
          id: questionId,
        },
        data: {
          userAnswer,
        },
      });
      if (question.questionType === 'mcq') {
        const isCorrect =
          question.answer.toLowerCase().trim() ===
          userAnswer.toLowerCase().trim();

        await db.question.update({
          where: {id: questionId},
          data: {
            isCorrect,
          },
        });
        return res.status(200).json({
          isCorrect,
        });
      } else if (question.questionType === 'open_ended') {
        let percentageSimilar = compareTwoStrings(
          userAnswer.toLowerCase().trim(),
          question.answer.toLowerCase().trim(),
        );
        percentageSimilar = Math.round(percentageSimilar * 100);
        await db.question.update({
          where: {
            id: questionId,
          },
          data: {
            percentageCorrect: percentageSimilar,
          },
        });
        return res.status(200).json({
          percentageSimilar,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);
