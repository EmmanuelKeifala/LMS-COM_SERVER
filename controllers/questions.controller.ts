/** @format */

// Package imports
import {Request, Response, NextFunction} from 'express';
require('dotenv').config();

import clerkClient from '@clerk/clerk-sdk-node';

// File Imports
import ErrorHandler from '../utils/ErrorHandler';
import {strict_output} from '../utils/gpt';
import {CatchAsyncErrors} from '../middleware/catchAsyncErrors';

export const generateQuestions = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {userId, amount, topic, type} = await req.body;

      // Validation
      if (!userId || !amount || !topic || !type)
        return next(new ErrorHandler('Please provide all fields', 400));
      const user = await clerkClient.users.getUser(userId);
      if (!user) return next(new ErrorHandler('User not found', 400));

      // Define a maximum chunk size
      const chunkSize = 5; // Adjust this value as needed

      // Create an array to hold all generated questions
      let allQuestions: any[] = [];

      // Create prompts based on the requested amount in batches
      for (let i = 0; i < amount; i += chunkSize) {
        const prompts: string[] = [];
        // Generate prompts for the current batch
        for (let j = i; j < Math.min(i + chunkSize, amount); j++) {
          prompts.push(
            `You are to generate a random hard ${type} question about ${topic}`,
          );
        }
        // Call strict_output for the current batch based on type
        let questionsBatch: any;
        if (type === 'open_ended') {
          questionsBatch = await strict_output(
            'You are a helpful AI that is able to generate a pair of question and answers, the length of each answer should not be more than 15 words and they should be undergraduate based take them from online sources and they should be medical field focus, store all the pairs of answers and questions in a JSON array',
            prompts,
            {
              question: 'question',
              answer: 'answer with max length of 15 words',
            },
          );
        } else if (type === 'mcq') {
          questionsBatch = await strict_output(
            'You are a helpful AI that is able to generate mcq questions and answers, the length of each answer should not be more than 15 words and they should be undergraduate based take them from online sources and they should be medical field focus, store all answers and questions and options in a JSON array',
            prompts,
            {
              question: 'question',
              answer: 'answer with max length of 15 words',
              option1: 'option1 with max length of 15 words',
              option2: 'option2 with max length of 15 words',
              option3: 'option3 with max length of 15 words',
            },
          );
        }
        // Append the generated questions to the allQuestions array
        allQuestions = allQuestions.concat(questionsBatch);
      }

      // Return the concatenated questions array
      return res.status(200).json({
        success: true,
        questions: allQuestions,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);
