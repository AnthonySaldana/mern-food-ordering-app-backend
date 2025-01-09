import express from 'express';
import { createRecipe, getRecipes } from '../controllers/RecipeController';

const router = express.Router();

router.post('/', createRecipe);
router.get('/', getRecipes);

export default router;