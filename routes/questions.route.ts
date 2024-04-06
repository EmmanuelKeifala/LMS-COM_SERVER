/** @format */

// Package imports
import express from 'express';

// File Imports
import {
  generateQuestions,
  // ticketUpload,
} from '../controllers/questions.controller';

const questionRoute = express.Router();

// Routes
// Register user
questionRoute.post('/question', generateQuestions);

export default questionRoute;
