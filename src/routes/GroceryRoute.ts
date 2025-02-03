import express from 'express';
import { searchGroceryStores, searchProducts, getGeolocation, createGroceryOrder, findStoresForShoppingList,
    createShoppingListOrder, getStoreInventory, getPaymentMethods, createPaymentMethod, getCoordinatesFromAddress,
    searchCart, processStoreInventory, createAddress, getAddresses, deletePaymentMethod, deleteAddress } from '../controllers/GroceryController';
import { getFitbiteInventory } from '../workers/groceryWorker';
import { jwtCheck, jwtParse } from '../middleware/auth';

const router = express.Router();

router.get('/search/stores', searchGroceryStores);
router.get('/search/products', searchProducts);
router.post('/geolocation', getGeolocation);
router.post('/create-order', createGroceryOrder);
router.post('/find-stores-for-shopping-list', findStoresForShoppingList);
router.post('/create-shopping-list-order', createShoppingListOrder);
router.get('/inventory', getStoreInventory);
router.get('/payment-methods', jwtCheck, jwtParse, getPaymentMethods);
router.post('/payment-methods', createPaymentMethod);
router.post('/geocode-address', getCoordinatesFromAddress);
router.get('/search/cart', searchCart);
router.post('/process-inventory', processStoreInventory);
router.post('/fitbite-inventory', getFitbiteInventory);
router.post('/addresses', jwtCheck, jwtParse, createAddress);
router.get('/addresses', jwtCheck, jwtParse, getAddresses);
router.post('/payment-methods/delete', jwtCheck, jwtParse, deletePaymentMethod);
router.post('/addresses/delete', jwtCheck, jwtParse, deleteAddress);
export default router;
