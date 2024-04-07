/** @format */

// Package imports
import express from 'express';
import {getDashboardCourses} from '../controllers/actions.controller';

// File Imports

const actionRouter = express.Router();

actionRouter.post('/getDashboardCourses', getDashboardCourses);

export default actionRouter;
