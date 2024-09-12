/** @format */

// Package Import
import {app} from './app';

var cron = require('node-cron');

require('dotenv').config();

// Files and utils imports
import connectDB from './utils/db';

// Create server
app.listen(process.env.PORT || 5000, () => {
  connectDB();
  console.log(`Server is connected on PORT: ${process.env.PORT}`);
});

cron.schedule('1-5 * * * *', () => {
  console.log('running every minute to 1 from 5');
});
