import mongoose, { Schema, Document } from "mongoose";

interface UnitDetail {
  _id: string;
  unit_of_measurement: string;
  unit_size: number;
}

interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

interface ShoppingListItem {
  product_id: string;
  name: string;
  searchTerm: string;
  product_marked_price: number | null;
  unit_of_measurement: string;
  unit_size: number;
  unit_details: UnitDetail[];
  macros: Macros;
  selected_options: any[];
  matched_item_id?: string;
  quantity?: number;
}

interface ShoppingListConfig extends Document {
  email: string;
  influencerId: string;
  storeId: string;
  shoppingList: ShoppingListItem[];
  activeMatchedItems: {[key: string]: any};
  quantities: {[key: string]: number};
}

const unitDetailSchema = new Schema({
  _id: { type: String, required: true },
  unit_of_measurement: { type: String, required: true },
  unit_size: { type: Number, required: true }
});

const macrosSchema = new Schema({
  protein: { type: Number, required: true },
  carbs: { type: Number, required: true },
  fat: { type: Number, required: true }
});

const shoppingListItemSchema = new Schema({
  product_id: { type: String, required: true },
  name: { type: String, required: true },
  searchTerm: { type: String, required: true },
  product_marked_price: { type: Number, default: null },
  unit_of_measurement: { type: String, required: true },
  unit_size: { type: Number, required: true },
  unit_details: [unitDetailSchema],
  macros: macrosSchema,
  selected_options: [Schema.Types.Mixed],
  matched_item_id: { type: String },
  quantity: { type: Number }
});

const activeMatchedItemSchema = new Schema({
  _id: Schema.Types.Mixed,
  name: String,
  price: Number,
  unit_size: Number,
  unit_of_measurement: String,
  image: String,
  is_available: Boolean
}, { strict: false });

const shoppingListConfigSchema = new Schema({
  email: { type: String, required: true },
  influencerId: { type: String, required: true },
  storeId: { type: String, required: true },
  shoppingList: [shoppingListItemSchema],
  activeMatchedItems: { type: Map, of: activeMatchedItemSchema },
  quantities: { type: Map, of: Number }
});

export default mongoose.model<ShoppingListConfig>("ShoppingListConfig", shoppingListConfigSchema);