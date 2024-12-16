import express from 'express';
import { searchGroceryStores, searchProducts, getGeolocation, createGroceryOrder, findStoresForShoppingList, createShoppingListOrder, getStoreInventory } from '../controllers/GroceryController';

const router = express.Router();

router.get('/search/stores', searchGroceryStores);
router.get('/search/products', searchProducts);
router.post('/geolocation', getGeolocation);
router.post('/create-order', createGroceryOrder);
router.post('/find-stores-for-shopping-list', findStoresForShoppingList);
router.post('/create-shopping-list-order', createShoppingListOrder);
router.get('/inventory', getStoreInventory);

export default router;
