/** @format */

// Package imports
import express from 'express';
import {chat} from '../controllers/chat.controller';

// File Imports

const chatRouter = express.Router();

chatRouter.post('/chat', chat);

export default chatRouter;
