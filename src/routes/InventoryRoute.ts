import express from 'express';
import { searchInventoryItems } from '../controllers/InventoryController';

const router = express.Router();

router.get('/search', searchInventoryItems);

export default router;