const mongoose = require('mongoose');
require('dotenv').config();

async function migrateFlightData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airticket');

    const db = mongoose.connection.db;
    const flightsCollection = db.collection('flights');

    console.log('🔄 Starting flight data migration...\n');

    // 1. Check current indexes
    const indexes = await flightsCollection.indexes();
    console.log('Current indexes on flights collection:');
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${JSON.stringify(index, null, 2)}`);
    });

    // 2. Find documents with flightCode but no flightNumber
    const docsWithFlightCode = await flightsCollection.find({
      flightCode: { $exists: true },
      flightNumber: { $exists: false }
    }).toArray();

    console.log(`\nFound ${docsWithFlightCode.length} documents with flightCode but no flightNumber`);

    if (docsWithFlightCode.length > 0) {
      console.log('Migrating flightCode to flightNumber...');

      // Migrate flightCode to flightNumber
      for (const doc of docsWithFlightCode) {
        await flightsCollection.updateOne(
          { _id: doc._id },
          {
            $set: { flightNumber: doc.flightCode },
            $unset: { flightCode: "" }
          }
        );
      }

      console.log(`✅ Migrated ${docsWithFlightCode.length} documents from flightCode to flightNumber`);
    }

    // 3. Find and delete documents with null flightNumber
    const nullFlightNumberDocs = await flightsCollection.find({
      flightNumber: null
    }).toArray();

    console.log(`\nFound ${nullFlightNumberDocs.length} documents with null flightNumber`);

    if (nullFlightNumberDocs.length > 0) {
      console.log('Deleting documents with null flightNumber...');
      const deleteResult = await flightsCollection.deleteMany({
        flightNumber: null
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} documents with null flightNumber`);
    }

    // 4. Check for duplicate flightNumbers
    console.log('\n🔍 Checking for duplicate flightNumbers...');
    const duplicates = await flightsCollection.aggregate([
      { $group: { _id: '$flightNumber', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate flightNumbers:');
      duplicates.forEach(dup => {
        console.log(`   ${dup._id}: ${dup.count} occurrences`);
      });

      // Remove duplicates, keep only the first occurrence
      for (const dup of duplicates) {
        const docs = await flightsCollection.find({ flightNumber: dup._id }).toArray();
        // Delete all but the first one
        for (let i = 1; i < docs.length; i++) {
          await flightsCollection.deleteOne({ _id: docs[i]._id });
        }
      }
      console.log(`✅ Removed ${duplicates.reduce((sum, dup) => sum + (dup.count - 1), 0)} duplicate documents`);
    } else {
      console.log('✅ No duplicate flightNumbers found');
    }

    // 5. Final statistics
    const totalDocs = await flightsCollection.countDocuments();
    const docsWithFlightNumber = await flightsCollection.countDocuments({ flightNumber: { $exists: true } });

    console.log(`\n📊 Final Statistics:`);
    console.log(`   Total documents: ${totalDocs}`);
    console.log(`   Documents with flightNumber: ${docsWithFlightNumber}`);
    console.log(`   Documents without flightNumber: ${totalDocs - docsWithFlightNumber}`);

    // 6. Show sample documents
    const sampleDocs = await flightsCollection.find({}).limit(3).toArray();
    console.log('\n📋 Sample documents:');
    sampleDocs.forEach((doc, i) => {
      console.log(`${i + 1}. ${JSON.stringify(doc, null, 2)}`);
    });

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the migration
migrateFlightData();
