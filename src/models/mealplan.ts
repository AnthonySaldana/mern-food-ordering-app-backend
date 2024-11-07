import mongoose, { InferSchemaType } from "mongoose";
import { MenuItem } from "./influencer";

const mealPlanSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    default: () => new mongoose.Types.ObjectId(),
  },
  name: { type: String, required: true },
  totalCalories: { type: Number, required: true },
  menuItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true }],
  influencer: { type: mongoose.Schema.Types.ObjectId, ref: "Influencer", required: true },
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
