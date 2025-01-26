import { Request, Response } from "express";
import Recipe from "../models/recipe";
import mongoose from "mongoose";

export const createRecipe = async (req: Request, res: Response) => {
  try {
    const recipe = new Recipe(req.body);
    await recipe.save();
    res.status(201).json(recipe);
  } catch (error) {
    console.error("Error creating recipe:", error);
    res.status(500).json({ message: "Error creating recipe" });
  }
};

export const getRecipes = async (req: Request, res: Response) => {
  try {
    const { influencerId } = req.params;

    if (!influencerId) {
      return res.status(400).json({ message: "Influencer ID is required" });
    }

    console.log("influencerId", influencerId);

    const recipes = await Recipe.find({ influencer_id: new mongoose.Types.ObjectId(influencerId) });
    console.log("recipes", recipes);
    res.json(recipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ message: "Error fetching recipes" });
  }
};

export const updateAllRecipesWithInfluencerId = async (req: Request, res: Response) => {
  try {
    const result = await Recipe.updateMany(
      { influencerId: { $exists: false } }, // find docs without influencerId
      { $set: { influencer_id: "6757c90012e8f24375fcfca1" } }
    );

    console.log("result", result);

    res.json({
      message: "Successfully updated recipes",
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error("Error updating recipes:", error);
    res.status(500).json({ message: "Error updating recipes" });
  }
};
