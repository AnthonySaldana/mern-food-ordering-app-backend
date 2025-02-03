import { Request, Response } from "express";
import ShoppingListConfig from "../models/shoppingList";
import { InventoryItem } from "../models/grocery";
// Save shopping list configuration
export const saveShoppingList = async (req: Request, res: Response) => {
  const { userId, influencerId, storeId, shoppingList } = req.body;
  try {
    const config = new ShoppingListConfig({ userId, influencerId, storeId, shoppingList });
    await config.save();
    res.status(201).json(config);
  } catch (error) {
    console.log(error, "error in saveShoppingList");
    res.status(500).json({ error: "Failed to save configuration" });
  }
};

// Retrieve shopping list configuration 
export const getShoppingList = async (req: Request, res: Response) => {
  const { userId, influencerId, storeId } = req.query;
  try {
    const config = await ShoppingListConfig.findOne({ userId, influencerId, storeId });
    if (config) {
      // Get all matched_item_ids from the shopping list
      const matchedItemIds = config.shoppingList
        .filter(item => item.matched_item_id)
        .map(item => item.matched_item_id);

      // Fetch inventory items for matched_item_ids
      const inventoryItems = await InventoryItem.find({
        _id: { $in: matchedItemIds }
      });

      // Create a map of inventory items by ID for easy lookup
      const inventoryItemMap = inventoryItems.reduce((acc: any, item: any) => {
        acc[item._id.toString()] = item;
        return acc;
      }, {});

      console.log(inventoryItemMap, "inventoryItemMap");

      // Attach inventory items to shopping list
      const enrichedShoppingList = config.shoppingList.map((item: any) => {
        if (!item.matched_item_id) {
          return { ...item._doc };
        }
        return {
          ...item._doc,
          ...inventoryItemMap[item.matched_item_id]._doc,
          imageUrl: inventoryItemMap[item.matched_item_id]._doc.image,
          matchedItem: item
        };
      });

    //   console.log(config, "config");
      console.log(enrichedShoppingList, "enrichedShoppingList");

      res.json({
        ...config.toObject(),
        shoppingList: enrichedShoppingList
      });
    } else {
      res.status(404).json({ error: "Configuration not found" });
    }
  } catch (error) {
    console.error("Error in getShoppingList:", error);
    res.status(500).json({ error: "Failed to retrieve configuration" });
  }
};