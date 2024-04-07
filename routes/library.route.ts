/** @format */

// Package imports
import express from 'express';
import {getBooks} from '../controllers/library.controller';

// File Imports

const libraryRouter = express.Router();

libraryRouter.post('/getBooks', getBooks);

export default libraryRouter;
