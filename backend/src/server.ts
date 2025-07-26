import dotenv from 'dotenv';
import path from 'path';
import './models';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import app from './app';
import mongoose from 'mongoose';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('MongoDB Connected');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();