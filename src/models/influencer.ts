import mongoose, { InferSchemaType } from "mongoose";
import { mealPlanSchema } from "./mealplan";

const socialSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  handle: { type: String, required: true },
});

const macroSchema = new mongoose.Schema({
  protein: { type: Number },
  carbs: { type: Number }, 
  fat: { type: Number }
});

export type MenuItem = InferSchemaType<typeof menuItemSchema>;

export const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  ingredients: { type: String },
  calories: { type: Number },
  macros: macroSchema,
  imageUrl: { type: String },
  gallery: [{ type: String }],
});

export type SocialType = InferSchemaType<typeof socialSchema>;

const influencerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String, required: true },
  bio: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  deliveryPrice: { type: Number, required: true },
  estimatedDeliveryTime: { type: Number, required: true },
  socialMediaHandles: [socialSchema],
  cuisines: [{ type: String, required: true }],
  menuItems: [menuItemSchema],
  mealPlans: [mealPlanSchema],
  imageUrl: { type: String },
  lastUpdated: { type: Date },
});

const Influencer = mongoose.model("Influencer", influencerSchema);
export default Influencer;
