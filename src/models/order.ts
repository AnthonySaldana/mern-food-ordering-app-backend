import mongoose from "mongoose";
import Influencer from "./influencer";

const orderSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  influencer: { type: mongoose.Schema.Types.ObjectId, ref: "Influencer" },
  meal_plan_name: { type: String, required: true },
  influencer_id: { type: mongoose.Schema.Types.ObjectId, ref: "Influencer" },
  deliveryDetails: {
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
    street_num: { type: String, required: false },
    street_name: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    country: { type: String, default: 'US' },
    zipcode: { type: String, required: false },
    instructions: { type: String },
    tip_amount: { type: Number, default: 0 }
  },
  cartItems: [
    {
      menuItemId: { type: String, required: true },
      quantity: { type: Number, required: true },
      name: { type: String, required: true },
    },
  ],
  totalAmount: Number,
  status: {
    type: String,
    enum: ["placed", "paid", "inProgress", "outForDelivery", "delivered"],
  },
  createdAt: { type: Date, default: Date.now },
});

export const Order = mongoose.model("Order", orderSchema);
