import {NextFunction, Request, Response} from 'express';
import {CatchAsyncErrors} from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import {Category, Chapter, Course, Level, PrismaClient} from '@prisma/client';
import {getProgress} from '../utils/get-progress';

import {withAccelerate} from '@prisma/extension-accelerate';

const db = new PrismaClient().$extends(withAccelerate());

type CourseWithProgressWithCategory = Course & {
  category: Category;
  chapters: Chapter[];
  progress: number | null;
  level: Level | null;
};

type DashboardCourses = {
  completedCourses: CourseWithProgressWithCategory[];
  coursesInProgress: CourseWithProgressWithCategory[];
};

export const getDashboardCourses = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.body.userId;

      if (!userId) return next(new ErrorHandler('UserId is required', 400));

      const purchasedCourses = await db.joined.findMany({
        where: {
          userId: userId,
        },
        select: {
          course: {
            include: {
              category: true,
              level: true,
              chapters: {
                where: {
                  isPublished: true,
                },
              },
            },
          },
        },
        cacheStrategy: {swr: 60, ttl: 60},
      });
      const courseIds = purchasedCourses.map(purchase => purchase.course.id);
      const progressPromises = courseIds.map(courseId =>
        getProgress(userId, courseId),
      );
      const progressResults = await Promise.all(progressPromises);

      const coursesWithProgress: any = purchasedCourses.map(
        (purchase, index) => ({
          ...purchase.course,
          progress: progressResults[index],
        }),
      );

      const completedCourses = coursesWithProgress.filter(
        (course: {progress: number}) => course.progress === 100,
      );
      const coursesInProgress = coursesWithProgress.filter(
        (course: {progress: any}) => (course.progress ?? 0) < 100,
      );

      res.status(200).json({
        completedCourses,
        coursesInProgress,
      } as DashboardCourses);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  },
);
