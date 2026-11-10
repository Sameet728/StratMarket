require("dotenv").config({ path: ".env.local" });
const { MongoClient } = require("mongodb");

function isTestEmail(email, name) {
  if (!email) return true;
  const e = email.toLowerCase().trim();
  if (
    e.includes("trial_tester") ||
    e.includes("test_limit") ||
    e.includes("reset_") ||
    e.includes("iso1_") ||
    e.includes("iso2_") ||
    e.includes("sec_") ||
    e.includes("entitled_") ||
    e.includes("test_") ||
    e.includes("@trader.stratmarket") ||
    e.includes("+test")
  ) {
    return true;
  }
  if (name && (name.includes("Trial Tester") || name.includes("Test Limit") || name.includes("Reset User"))) {
    return true;
  }
  return false;
}

async function cleanup() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI in .env.local");
    return;
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("stratmarket");

  const allUsers = await db.collection("users").find({}).toArray();
  const testIds = [];
  const testEmails = [];

  for (const u of allUsers) {
    if (isTestEmail(u.email, u.name)) {
      if (u.id) testIds.push(u.id);
      if (u._id) testIds.push(u._id.toString());
      testEmails.push(u.email.toLowerCase().trim());
    }
  }

  console.log("Identified", testEmails.length, "test users to delete.");

  // Delete from users collection
  const userDel = await db.collection("users").deleteMany({
    email: { $in: testEmails },
  });
  console.log("Deleted from users collection:", userDel.deletedCount);

  // Delete from trials collection
  const trialsDel = await db.collection("trials").deleteMany({
    userId: { $in: testIds },
  });
  console.log("Deleted from trials collection:", trialsDel.deletedCount);

  // Delete from alert_preferences collection
  const prefsDel = await db.collection("alert_preferences").deleteMany({
    $or: [
      { verifiedDestination: { $in: testEmails } },
      { userId: { $in: testIds } },
    ],
  });
  console.log("Deleted from alert_preferences collection:", prefsDel.deletedCount);

  // Delete from deliveries collection
  const delivDel = await db.collection("deliveries").deleteMany({
    $or: [
      { recipientEmail: { $in: testEmails } },
      { recipientEmail: { $exists: false } },
      { recipientEmail: "" },
    ],
  });
  console.log("Deleted from deliveries collection:", delivDel.deletedCount);

  // Delete from password_resets collection
  const pwDel = await db.collection("password_resets").deleteMany({
    email: { $in: testEmails },
  });
  console.log("Deleted from password_resets collection:", pwDel.deletedCount);

  // Verify remaining real users
  const remainingUsers = await db.collection("users").find({}).toArray();
  console.log("Remaining real users count:", remainingUsers.length);
  console.log("Remaining real users list:", remainingUsers.map((u) => ({ id: u.id, name: u.name, email: u.email })));

  // Verify remaining deliveries
  const remainingDeliv = await db.collection("deliveries").countDocuments();
  console.log("Remaining real deliveries count:", remainingDeliv);

  await client.close();
}

cleanup().catch(console.error);
