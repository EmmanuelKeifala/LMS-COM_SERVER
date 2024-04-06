/** @format */

// Package imports
import express from 'express';
import {endGame} from '../controllers/endGame.controller';

// File Imports

const endGameRouter = express.Router();

endGameRouter.post('/endGame', endGame);

export default endGameRouter;
