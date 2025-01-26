import express from 'express';
import { createRecipe, getRecipes, updateAllRecipesWithInfluencerId } from '../controllers/RecipeController';

const router = express.Router();

router.post('/', createRecipe);
router.get('/:influencerId', getRecipes);
router.put('/update-all-recipes-with-influencer-id', updateAllRecipesWithInfluencerId);

export default router;