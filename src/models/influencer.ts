import mongoose, { InferSchemaType } from "mongoose";
import { MealPlanType } from "./mealplan";

const socialSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  handle: { type: String, required: true },
});

export type SocialType = InferSchemaType<typeof socialSchema>;

const influencerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String, required: true },
  bio: { type: String, required: true },
  socials: [socialSchema],
  mealPlans: [{ type: mongoose.Schema.Types.ObjectId, ref: "MealPlan" }],
  imageUrl: { type: String },
  lastUpdated: { type: Date },
});

const Influencer = mongoose.model("Influencer", influencerSchema);
export default Influencer;
