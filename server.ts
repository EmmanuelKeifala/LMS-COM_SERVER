/** @format */

// Package Import
import {app} from './app';
require('dotenv').config();

// Files and utils imports
import connectDB from './utils/db';

// Create server
app.listen(process.env.PORT, () => {
  connectDB();
  console.log(`Server is connected on PORT: ${process.env.PORT}`);
});
