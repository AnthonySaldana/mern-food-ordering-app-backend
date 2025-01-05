import mongoose from "mongoose";
import Influencer from "./influencer";

const orderSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  influencer: { type: mongoose.Schema.Types.ObjectId, ref: "Influencer" },
  meal_plan_name: { type: String, required: true },
  deliveryDetails: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    street_num: { type: String, required: true },
    street_name: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'US' },
    zipcode: { type: String, required: true },
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
