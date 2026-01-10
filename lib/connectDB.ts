import mongoose from "mongoose";

const connected = {
  isConnected: 0,
};

async function connectDB() {
  if (connected.isConnected) {
    return mongoose.connection; // ✅ return existing connection
  }

  try {
    const db = await mongoose.connect(process.env.MONGOSEDB_URI!);
    connected.isConnected = db.connections[0].readyState;

    return db; // ✅ return the connection
  } catch (e) {
    console.error("MongoDB connection error:", e);
    throw new Error("Failed to connect to MongoDB");
  }
}

export default connectDB;
