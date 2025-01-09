import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";
import myUserRoute from "./routes/MyUserRoute";
import { v2 as cloudinary } from "cloudinary";
import myRestaurantRoute from "./routes/MyRestaurantRoute";
import restaurantRoute from "./routes/RestaurantRoute";
import orderRoute from "./routes/OrderRoute";
import influencerRoute from "./routes/InfluencerRoute";
import groceryRoute from "./routes/GroceryRoute";
import recipeRoute from "./routes/RecipeRoute";
const PORT = process.env.PORT || 7000;
mongoose
  .connect(process.env.MONGODB_CONNECTION_STRING as string)
  .then(() => console.log("Connected to database!"))
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

app.use(cors());

app.use("/api/order/checkout/webhook", express.raw({ type: "*/*" }));

app.use(express.json());

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("Error details:", {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
  res.status(500).json({ message: "Internal server error" });
});

app.get("/health", async (req: Request, res: Response) => {
  res.send({ message: "health OK!" });
});

app.use("/api/my/user", myUserRoute);
app.use("/api/my/restaurant", myRestaurantRoute);
app.use("/api/restaurant", restaurantRoute);
app.use("/api/influencer", influencerRoute);
app.use("/api/order", orderRoute);
app.use("/api/grocery", groceryRoute);
app.use("/api/recipe", recipeRoute);

app.listen(PORT, () => {
  console.log(`server started on localhost:${PORT}`);
}).on('error', (error) => {
  console.error("Server startup error:", error);
  process.exit(1);
});
