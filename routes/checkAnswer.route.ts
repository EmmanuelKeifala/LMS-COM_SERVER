/** @format */

// Package imports
import express from 'express';
import {checkAnswer} from '../controllers/checkAnswer.controller';

// File Imports

const checkAnswerRouter = express.Router();

checkAnswerRouter.post('/checkAnswer', checkAnswer);

export default checkAnswerRouter;
