import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String },
  verified: { type: Boolean, default: false },
  site: { type: String, default: "" },
  role: { type: String, enum: ["employee", "manager", "admin"], default: "employee" }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", UserSchema);

const CustomProductSchema = new mongoose.Schema({
  uniquename: { type: String, required: true, unique: true },
  typedequantite: { type: String, default: "" }
}, { timestamps: true });

export const CustomProduct = mongoose.models.CustomProduct || mongoose.model("CustomProduct", CustomProductSchema);

const AttendanceSchema = new mongoose.Schema({
  clerkId: { type: String, required: true },
  dateStr: { type: String, required: true },
  status: { type: String, enum: ["FULL", "HALF", "ABSENT", ""] },
  site: { type: String }
}, { timestamps: true });

AttendanceSchema.index({ clerkId: 1, dateStr: 1 }, { unique: true });

export const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);

const SiteSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  line1: { type: String, default: "" },
  line2: { type: String, default: "" },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export const Site = mongoose.models.Site || mongoose.model("Site", SiteSchema);
