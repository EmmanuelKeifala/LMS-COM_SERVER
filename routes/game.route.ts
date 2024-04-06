/** @format */

// Package imports
import express from 'express';
import {gameGeneration} from '../controllers/game.controller';

// File Imports

const gameRouter = express.Router();

gameRouter.post('/game', gameGeneration);

export default gameRouter;
