import mongoose, { Schema, Document } from 'mongoose';

interface Recipe extends Document {
  name: string;
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
  ingredients: string;
  instructions: string;
}

const RecipeSchema: Schema = new Schema({
  name: { type: String, required: true },
  calories: { type: Number, required: true },
  carbs: { type: Number, required: true },
  fat: { type: Number, required: true },
  protein: { type: Number, required: true },
  ingredients: { type: String, required: true },
  instructions: { type: String, required: true },
});

export default mongoose.model<Recipe>('Recipe', RecipeSchema);
