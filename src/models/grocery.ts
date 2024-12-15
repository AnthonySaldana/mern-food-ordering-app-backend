import mongoose, { InferSchemaType } from "mongoose";

const shoppingListItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  alternativeNames: [{ type: String }], // For flexibility in matching
  category: { type: String },
  preferredBrands: [{ type: String }]
});

const shoppingListSchema = new mongoose.Schema({
  name: { type: String, required: true },
  items: [shoppingListItemSchema]
});

export type ShoppingListItemType = InferSchemaType<typeof shoppingListItemSchema>;
export type ShoppingListType = InferSchemaType<typeof shoppingListSchema>;

export const ShoppingListItem = mongoose.model("ShoppingListItem", shoppingListItemSchema);
export const ShoppingList = mongoose.model("ShoppingList", shoppingListSchema);