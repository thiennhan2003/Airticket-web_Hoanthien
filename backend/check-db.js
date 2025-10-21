const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airticket');

    const db = mongoose.connection.db;

    // Check if flights collection exists
    const collections = await db.listCollections({ name: 'flights' }).toArray();
    console.log('Flights collection exists:', collections.length > 0);

    if (collections.length > 0) {
      // Get all indexes
      const indexes = await db.collection('flights').indexes();
      console.log('Current indexes on flights collection:');
      indexes.forEach((index, i) => {
        console.log(`${i + 1}. ${JSON.stringify(index, null, 2)}`);
      });

      // Check for documents with null flightNumber
      const nullFlightNumberDocs = await db.collection('flights').find({
        flightNumber: null
      }).toArray();

      console.log(`\nDocuments with null flightNumber: ${nullFlightNumberDocs.length}`);
      if (nullFlightNumberDocs.length > 0) {
        console.log('Sample documents with null flightNumber:');
        nullFlightNumberDocs.slice(0, 3).forEach((doc, i) => {
          console.log(`${i + 1}. ${JSON.stringify(doc, null, 2)}`);
        });
      }

      // Check total documents
      const totalDocs = await db.collection('flights').countDocuments();
      console.log(`\nTotal documents in flights collection: ${totalDocs}`);

      // Check for documents with flightCode field
      const docsWithFlightCode = await db.collection('flights').find({
        flightCode: { $exists: true }
      }).limit(3).toArray();

      console.log(`\nSample documents with flightCode field:`);
      docsWithFlightCode.forEach((doc, i) => {
        console.log(`${i + 1}. ${JSON.stringify(doc, null, 2)}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

checkDatabase();
