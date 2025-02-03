import mongoose, { Schema, Document } from "mongoose";

interface ShoppingListConfig extends Document {
  userId: string;
  influencerId: string;
  storeId: string;
  shoppingList: Array<{
    product_id: string;
    matched_item_id?: string;
    quantity: number;
  }>;
}

const shoppingListConfigSchema = new Schema({
  userId: { type: String, required: true },
  influencerId: { type: String, required: true },
  storeId: { type: String, required: true },
  shoppingList: [
    {
      product_id: { type: String, required: true },
      matched_item_id: { type: String, required: false },
      quantity: { type: Number, required: true },
    },
  ],
});

export default mongoose.model<ShoppingListConfig>("ShoppingListConfig", shoppingListConfigSchema);