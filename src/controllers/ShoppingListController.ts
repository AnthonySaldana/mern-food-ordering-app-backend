import { Request, Response } from "express";
import ShoppingListConfig from "../models/shoppingList";
import { InventoryItem } from "../models/grocery";
// Save shopping list configuration
export const saveShoppingList = async (req: Request, res: Response) => {
  const { email, influencerId, storeId, shoppingList, activeMatchedItems, quantities } = req.body;
  try {
    // Try to find existing configuration
    const existingConfig = await ShoppingListConfig.findOne({ influencerId, storeId });
    console.log(existingConfig, "existingConfig"); 
    
    if (existingConfig) {
      // Update existing configuration
      existingConfig.email = email;
      existingConfig.shoppingList = shoppingList;
      existingConfig.activeMatchedItems = activeMatchedItems;
      existingConfig.quantities = quantities;
      await existingConfig.save();
      res.status(200).json(existingConfig);
    } else {
      // Create new configuration
      const config = new ShoppingListConfig({ email, influencerId, storeId, shoppingList, activeMatchedItems, quantities });
      await config.save();
      res.status(201).json(config);
    }
  } catch (error) {
    console.log(error, "error in saveShoppingList");
    res.status(500).json({ error: "Failed to save configuration" });
  }
};

// Retrieve shopping list configuration 
export const getShoppingList = async (req: Request, res: Response) => {
  const { email, influencerId, storeId } = req.query;
  try {
    const config = await ShoppingListConfig.findOne({ influencerId, storeId });
    console.log(config, "config in getShoppingList");
    if (config) {
      res.json(config);
    } else {
      res.status(404).json({ error: "Configuration not found" });
    }
  } catch (error) {
    console.error("Error in getShoppingList:", error);
    res.status(500).json({ error: "Failed to retrieve configuration" });
  }
};