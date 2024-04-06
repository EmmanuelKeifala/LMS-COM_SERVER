import {CatchAsyncErrors} from '../middleware/catchAsyncErrors';
import {Request, Response, NextFunction, raw} from 'express';
import ErrorHandler from '../utils/ErrorHandler';
import {PrismaClient} from '@prisma/client';
const db = new PrismaClient();

export const endGame = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {gameId} = await req.body;

      const game = await db.game.findUnique({
        where: {
          id: gameId,
        },
      });
      if (!game) return next(new ErrorHandler('Game not found', 404));

      await db.game.update({
        where: {
          id: gameId,
        },
        data: {
          timeEned: new Date(),
        },
      });
      res.status(200).json({success: true, message: 'GAME ENDED'});
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);
