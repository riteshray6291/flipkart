import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI?.trim();
  const databaseName = process.env.MONGODB_DATABASE?.trim() || "ecommerce";

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is required. Add your MongoDB connection string to backend/.env.",
    );
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: databaseName,
      serverSelectionTimeoutMS: 15000,
    });

    console.log(
      `Connected to MongoDB database ${databaseName} at ${mongoose.connection.host}`,
    );
  } catch (error) {
    const message = error?.message || "Unknown MongoDB connection error";
    const whitelistHint =
      "If you're using MongoDB Atlas, add your current IP to Network Access in Atlas, then retry.";

    throw new Error(`${message}. ${whitelistHint}`);
  }
};

export default connectDB;
