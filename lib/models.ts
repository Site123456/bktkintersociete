import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String },
  verified: { type: Boolean, default: false }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", UserSchema);

const CustomProductSchema = new mongoose.Schema({
  uniquename: { type: String, required: true, unique: true },
  typedequantite: { type: String, default: "" }
}, { timestamps: true });

export const CustomProduct = mongoose.models.CustomProduct || mongoose.model("CustomProduct", CustomProductSchema);
