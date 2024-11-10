import mongoose, { InferSchemaType } from "mongoose";
import { MenuItem } from "./influencer";


const macroSchema = new mongoose.Schema({
  protein: { type: Number },
  carbs: { type: Number }, 
  fat: { type: Number }
});

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  ingredients: { type: String },
  calories: { type: Number },
  macros: macroSchema,
  imageUrl: { type: String },
  gallery: [{ type: String }],
});

export const mealPlanSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    default: () => new mongoose.Types.ObjectId(),
  },
  name: { type: String, required: true },
  totalCalories: { type: Number, required: true },
  menuItems: { type: [menuItemSchema], default: [] },
  deliveryOptions: {
    type: [String],
    required: true,
  },
  startDayOptions: {
    type: [String],
    required: true,
  },
});

export type MenuItemType = MenuItem;
export type MealPlanType = InferSchemaType<typeof mealPlanSchema>;

export default mongoose.model("MealPlan", mealPlanSchema);
