const mongoose = require('mongoose');
require('dotenv').config();

async function fixFlightIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airticket');

    const db = mongoose.connection.db;
    const flightsCollection = db.collection('flights');

    console.log('Current indexes on flights collection:');
    const indexes = await flightsCollection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${JSON.stringify(index, null, 2)}`);
    });

    // Drop the old flightNumber index if it exists
    try {
      await flightsCollection.dropIndex('flightNumber_1');
      console.log('✅ Successfully dropped old flightNumber_1 index');
    } catch (error) {
      console.log('ℹ️  flightNumber_1 index does not exist or already dropped');
    }

    // Drop the old flightCode index if it exists
    try {
      await flightsCollection.dropIndex('flightCode_1');
      console.log('✅ Successfully dropped old flightCode_1 index');
    } catch (error) {
      console.log('ℹ️  flightCode_1 index does not exist or already dropped');
    }

    // Clean up documents with null flightNumber
    const nullFlightNumberDocs = await flightsCollection.find({
      flightNumber: null
    }).toArray();

    if (nullFlightNumberDocs.length > 0) {
      console.log(`Found ${nullFlightNumberDocs.length} documents with null flightNumber`);
      await flightsCollection.deleteMany({ flightNumber: null });
      console.log(`✅ Deleted ${nullFlightNumberDocs.length} documents with null flightNumber`);
    }

    // Clean up documents with null flightCode
    const nullFlightCodeDocs = await flightsCollection.find({
      flightCode: null
    }).toArray();

    if (nullFlightCodeDocs.length > 0) {
      console.log(`Found ${nullFlightCodeDocs.length} documents with null flightCode`);
      await flightsCollection.deleteMany({ flightCode: null });
      console.log(`✅ Deleted ${nullFlightCodeDocs.length} documents with null flightCode`);
    }

    console.log('\n✅ Database cleanup completed successfully!');
    console.log('Please restart the backend to recreate indexes with the new model.');

  } catch (error) {
    console.error('❌ Error fixing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the fix
fixFlightIndexes();
