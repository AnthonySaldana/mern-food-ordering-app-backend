import express from 'express';
import { saveShoppingList, getShoppingList } from '../controllers/ShoppingListController';

const router = express.Router();

router.post('/save', saveShoppingList);
router.get('/get', getShoppingList);

export default router;