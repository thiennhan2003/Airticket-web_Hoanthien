const mongoose = require('mongoose');
require('dotenv').config();

async function resetFlightsCollection() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airticket');

    const db = mongoose.connection.db;
    const flightsCollection = db.collection('flights');

    console.log('Dropping flights collection...');
    await flightsCollection.drop();

    console.log('✅ Successfully dropped flights collection');

    // Recreate the collection
    await db.createCollection('flights');
    console.log('✅ Successfully recreated flights collection');

    console.log('\nCollection is now ready. Restart the backend to recreate indexes with the new model.');

  } catch (error) {
    if (error.code === 26) {
      console.log('Collection does not exist, creating new one...');
      await db.createCollection('flights');
      console.log('✅ Successfully created flights collection');
    } else {
      console.error('❌ Error resetting collection:', error);
    }
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the reset
resetFlightsCollection();
