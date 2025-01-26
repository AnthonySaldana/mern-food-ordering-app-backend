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

const inventoryItemSchema = new mongoose.Schema({
  store_id: { type: String, required: true },
  product_id: { type: String, required: true, unique: true },
  name: { type: String, required: true, index: 'text' },
  price: { type: Number, required: true },
  unit_size: { type: String },
  unit_of_measurement: { type: String },
  description: { type: String },
  image: { type: String },
  is_available: { type: Boolean, required: true },
  upc: { type: String }
});

const storeProcessingStatusSchema = new mongoose.Schema({
  store_id: { type: String, required: true },
  is_processing: { type: Boolean, required: true },
  time_start: { type: Date, required: true },
  time_end: { type: Date }
});

export type ShoppingListItemType = InferSchemaType<typeof shoppingListItemSchema>;
export type ShoppingListType = InferSchemaType<typeof shoppingListSchema>;
export type InventoryItemType = InferSchemaType<typeof inventoryItemSchema>;

export const ShoppingListItem = mongoose.model("ShoppingListItem", shoppingListItemSchema);
export const ShoppingList = mongoose.model("ShoppingList", shoppingListSchema);
export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
export const StoreProcessingStatus = mongoose.model('StoreProcessingStatus', storeProcessingStatusSchema);