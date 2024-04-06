/** @format */

// Package imports
import express from 'express';
import {sendEmails} from '../controllers/mail.controller';

// File Imports

const sendMailRouter = express.Router();

sendMailRouter.post('/mail', sendEmails);

export default sendMailRouter;
