import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_CONNECTION ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGO_DB ?? "test";

export const connectMongo = async () => {
  try {
    await mongoose.connect(mongoUri, {
      dbName
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};
