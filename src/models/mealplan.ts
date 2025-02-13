import mongoose, { InferSchemaType } from "mongoose";
// import { MenuItem } from "./influencer";


const macroSchema = new mongoose.Schema({
  protein: { type: Number },
  carbs: { type: Number }, 
  fat: { type: Number }
});

const unitDetailsSchema = new mongoose.Schema({
  unit_of_measurement: { type: String },
  unit_size: { type: Number },
});

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  ingredients: { type: String },
  calories: { type: Number },
  macros: macroSchema,
  unit_of_measurement: { type: String },
  unit_size: { type: Number },
  unit_details: [unitDetailsSchema],
  imageUrl: { type: String },
  gallery: [{ type: String }],
  positiveDescriptors: { type: String },
  negativeDescriptors: { type: String },
});

export const mealPlanSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    default: () => new mongoose.Types.ObjectId(),
  },
  name: { type: String, required: true },
  description: { type: String },
  totalCalories: { type: Number, required: true },
  menuItems: [menuItemSchema],
  deliveryOptions: {
    type: [String],
    required: true,
  },
  startDayOptions: {
    type: [String],
    required: true,
  },
  imageUrl: { type: String },
});

// export type MenuItemType = MenuItem;
export type MealPlanType = InferSchemaType<typeof mealPlanSchema>;

export default mongoose.model("MealPlan", mealPlanSchema);
