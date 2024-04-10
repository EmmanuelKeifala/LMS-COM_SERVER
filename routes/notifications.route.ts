import express from 'express';
import {blogNotification} from '../controllers/notification.controller';

const notificationRouter = express.Router();

notificationRouter.post('/notification', blogNotification);

export default notificationRouter;
