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

      // Calculate the number of batches needed based on amount and chunkSize
      const batches = Math.ceil(amount / chunkSize);

      // Create an array to hold all generated questions
      let allQuestions: any[] = [];

      // Create prompts for all batches
      for (let i = 0; i < batches; i++) {
        const prompts: string[] = [];
        // Generate prompts for the current batch
        for (let j = 0; j < chunkSize && i * chunkSize + j < amount; j++) {
          prompts.push(
            `You are to generate a random and unique hard ${type} question about ${topic}`,
          );
        }
        // Call strict_output for the current batch based on type
        let questionsBatch: any;
        if (type === 'open_ended') {
          questionsBatch = await strict_output(
            'As a helpful AI, You can generate unique pairs of questions and answers suitable for undergraduate-level exams, sourced from online USMLE materials. Each answer will be concise, within 15 words do not repeat question. The focus is on medical topics. All pairs will be stored in a JSON array',
            prompts,
            {
              question: 'question',
              answer: 'answer with max length of 15 words',
            },
          );
        } else if (type === 'mcq') {
          questionsBatch = await strict_output(
            'You are a helpful AI that is able to generate mcq questions and answers suitable for undergraduate-level exams, sourced from online USMLE materials. Each answer will be concise, within 15 words do not repeat question. The focus is on medical topics. All pairs will be stored in a JSON array',
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
