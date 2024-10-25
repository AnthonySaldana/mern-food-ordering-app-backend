import mongoose, { InferSchemaType } from "mongoose";

const mealPlanRecipeSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    default: () => new mongoose.Types.ObjectId(),
  },
  name: { type: String, required: true },
  ingredients: [{ type: String, required: true }],
  instructions: { type: String, required: true },
  calories: { type: Number, required: true },
  macros: {
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
  },
});

const mealPlanDaySchema = new mongoose.Schema({
  day: { type: String, required: true },
  meals: [mealPlanRecipeSchema],
  totalCalories: { type: Number, required: true },
});

const mealPlanSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    default: () => new mongoose.Types.ObjectId(),
  },
  name: { type: String, required: true },
  days: [mealPlanDaySchema],
  influencer: { type: mongoose.Schema.Types.ObjectId, ref: "Influencer", required: true },
});

export type MealPlanRecipeType = InferSchemaType<typeof mealPlanRecipeSchema>;
export type MealPlanDayType = InferSchemaType<typeof mealPlanDaySchema>;
export type MealPlanType = InferSchemaType<typeof mealPlanSchema>;

export default mongoose.model("MealPlan", mealPlanSchema);
