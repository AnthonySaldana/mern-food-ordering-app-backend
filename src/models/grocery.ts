import mongoose, { InferSchemaType } from "mongoose";

const shoppingListItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  product_id: { type: String, required: true },
  product_marked_price: { type: Number }, // in cents
  selected_options: [{
    option_id: { type: String, required: true },
    quantity: { type: Number, required: true },
    marked_price: { type: Number },
    notes: { type: String }
  }],
  alternativeNames: [{ type: String }],
  category: { type: String },
  preferredBrands: [{ type: String }]
});

const shoppingListSchema = new mongoose.Schema({
  name: { type: String, required: true },
  items: [shoppingListItemSchema],
  store_id: { type: String } // To track which store this list is for
});

export type ShoppingListItemType = InferSchemaType<typeof shoppingListItemSchema>;
export type ShoppingListType = InferSchemaType<typeof shoppingListSchema>;

export const ShoppingListItem = mongoose.model("ShoppingListItem", shoppingListItemSchema);
export const ShoppingList = mongoose.model("ShoppingList", shoppingListSchema);