import express from 'express';
import { searchGroceryStores, searchProducts, getGeolocation, createGroceryOrder, findStoresForShoppingList,
    createShoppingListOrder, getStoreInventory, getPaymentMethods, createPaymentMethod, getCoordinatesFromAddress,
    searchCart, processStoreInventory, getFitbiteInventory } from '../controllers/GroceryController';

const router = express.Router();

router.get('/search/stores', searchGroceryStores);
router.get('/search/products', searchProducts);
router.post('/geolocation', getGeolocation);
router.post('/create-order', createGroceryOrder);
router.post('/find-stores-for-shopping-list', findStoresForShoppingList);
router.post('/create-shopping-list-order', createShoppingListOrder);
router.get('/inventory', getStoreInventory);
router.get('/payment-methods', getPaymentMethods);
router.post('/payment-methods', createPaymentMethod);
router.post('/geocode-address', getCoordinatesFromAddress);
router.get('/search/cart', searchCart);
router.post('/process-inventory', processStoreInventory);
router.get('/fitbite-inventory', getFitbiteInventory);
export default router;
