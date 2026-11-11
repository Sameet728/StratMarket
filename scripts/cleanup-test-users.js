const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const uri = env.MONGODB_URI || process.env.MONGODB_URI;
const dbName = env.MONGODB_DB_NAME || 'stratmarket';

async function main() {
  if (!uri) {
    console.error('No MONGODB_URI found in .env.local');
    return;
  }
  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected to MongoDB Atlas successfully!');
  const db = client.db(dbName);

  const testUserFilter = {
    $or: [
      { email: { $regex: 'trial_tester|test_limit|reset_|iso1_|iso2_|sec_|entitled_|@trader\\.stratmarket|\\+test|^test@', $options: 'i' } },
      { name: { $regex: 'Trial Tester|Test Limit|Reset User|Test User', $options: 'i' } }
    ]
  };

  const totalUsersBefore = await db.collection('users').countDocuments();
  console.log(`Total users in DB before: ${totalUsersBefore}`);

  const testUsers = await db.collection('users').find(testUserFilter).toArray();
  console.log(`Found ${testUsers.length} test user accounts to delete.`);

  const testEmails = testUsers.map(u => u.email).filter(Boolean);
  const testIds = testUsers.map(u => u._id).filter(Boolean);

  if (testUsers.length > 0) {
    // 1. Delete from users
    const deleteUsersRes = await db.collection('users').deleteMany(testUserFilter);
    console.log(`Deleted ${deleteUsersRes.deletedCount} users from 'users' collection.`);

    // 2. Delete from alert_preferences
    const deleteAlertsRes = await db.collection('alert_preferences').deleteMany({
      $or: [
        { verifiedDestination: { $in: testEmails } },
        { userId: { $in: testEmails.concat(testIds.map(id => id.toString())) } }
      ]
    });
    console.log(`Deleted ${deleteAlertsRes.deletedCount} records from 'alert_preferences'.`);

    // 3. Delete from deliveries
    const deleteDeliveriesRes = await db.collection('deliveries').deleteMany({
      recipientEmail: { $in: testEmails }
    });
    console.log(`Deleted ${deleteDeliveriesRes.deletedCount} records from 'deliveries'.`);

    // 4. Delete from password_resets
    const deleteResetsRes = await db.collection('password_resets').deleteMany({
      email: { $in: testEmails }
    });
    console.log(`Deleted ${deleteResetsRes.deletedCount} records from 'password_resets'.`);

    // 5. Delete from trials
    const deleteTrialsRes = await db.collection('trials').deleteMany({
      userId: { $in: testEmails.concat(testIds.map(id => id.toString())) }
    });
    console.log(`Deleted ${deleteTrialsRes.deletedCount} records from 'trials'.`);
  }

  const remainingUsers = await db.collection('users').find({}).toArray();
  console.log(`Remaining real users count: ${remainingUsers.length}`);
  remainingUsers.forEach(u => {
    console.log(`- ${u.name || 'Trader'} (${u.email}) [Role: ${u.role || 'CUSTOMER'}] Created: ${u.createdAt}`);
  });

  await client.close();
}

main().catch(console.error);

