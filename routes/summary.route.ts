/** @format */

// Package imports
import express from 'express';
import {summary} from '../controllers/summary.controller';

// File Imports

const summaryRoute = express.Router();

summaryRoute.post('/summary', summary);

export default summaryRoute;
