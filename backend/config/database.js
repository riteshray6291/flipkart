import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI?.trim();
  const databaseName = process.env.MONGODB_DATABASE?.trim() || "ecommerce";
  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is required. Add your MongoDB connection string to backend/.env.",
    );
  }

  await mongoose.connect(mongoUri, { dbName: databaseName });
  console.log(
    `Connected to MongoDB database ${databaseName} at ${mongoose.connection.host}`,
  );
};

export default connectDB;
