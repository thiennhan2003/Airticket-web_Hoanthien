const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupNullFlightCodes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airticket');

    const db = mongoose.connection.db;
    const flightsCollection = db.collection('flights');

    // Find all documents with null flightCode
    const nullFlightCodeDocs = await flightsCollection.find({
      flightCode: null
    }).toArray();

    console.log(`Found ${nullFlightCodeDocs.length} documents with null flightCode`);

    if (nullFlightCodeDocs.length === 0) {
      console.log('No documents with null flightCode found. Database is clean.');
      return;
    }

    // Delete documents with null flightCode
    console.log('Deleting documents with null flightCode...');
    const deleteResult = await flightsCollection.deleteMany({
      flightCode: null
    });

    console.log(`Deleted ${deleteResult.deletedCount} documents with null flightCode`);

    // Check if there are any remaining documents with null flightCode
    const remainingNullDocs = await flightsCollection.find({
      flightCode: null
    }).toArray();

    if (remainingNullDocs.length === 0) {
      console.log('✅ Successfully cleaned up all null flightCode documents');

      // Show remaining indexes to verify
      const indexes = await flightsCollection.indexes();
      console.log('\nCurrent indexes on flights collection:');
      indexes.forEach((index, i) => {
        console.log(`${i + 1}. ${JSON.stringify(index, null, 2)}`);
      });

      console.log('\nTotal remaining documents:', await flightsCollection.countDocuments());
    } else {
      console.log(`⚠️  Still ${remainingNullDocs.length} documents with null flightCode remaining`);
    }

  } catch (error) {
    console.error('❌ Error cleaning up database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the cleanup
cleanupNullFlightCodes();
