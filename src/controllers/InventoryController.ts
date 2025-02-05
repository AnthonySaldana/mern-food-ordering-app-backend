import { Request, Response } from 'express';
import { InventoryItem } from '../models/grocery';

export const searchInventoryItems = async (req: Request, res: Response) => {
  try {
    const { query, store_id } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    const items = await InventoryItem.find({
      name: { $regex: query, $options: 'i' }, // Case-insensitive search
      store_id: store_id as string // Filter by store_id
    }).limit(100);

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error searching inventory items', error });
  }
};