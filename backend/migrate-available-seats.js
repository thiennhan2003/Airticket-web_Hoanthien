import mongoose from 'mongoose';
import Flight from '../src/models/flight.model';
import { config } from 'dotenv';

// Load environment variables
config();

async function migrateAvailableSeats() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/AirPlanes");
    console.log('Connected to MongoDB');

    // Update all flights to set availableSeats equal to totalSeats
    const result = await Flight.updateMany(
      { availableSeats: { $exists: false } }, // Only update flights that don't have availableSeats field
      [
        {
          $set: {
            availableSeats: "$totalSeats" // Set availableSeats equal to totalSeats
          }
        }
      ]
    );

    console.log(`Updated ${result.modifiedCount} flights`);
    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run migration
migrateAvailableSeats();
