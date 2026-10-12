const mongoose = require("mongoose");
const dns = require("dns");

// Set reliable public DNS servers for MongoDB Atlas SRV record lookup on Windows environments
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Ignore if unable to set custom DNS servers
}

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai-interview";
    await mongoose.connect(mongoURI);
    console.log(`MongoDB connected successfully!`);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
  }
};

module.exports = connectDB;


