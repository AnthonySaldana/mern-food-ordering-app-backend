import { Request, Response } from "express";
import Influencer from "../models/influencer";
import cloudinary from "cloudinary";
import mongoose from "mongoose";
import MealPlan from "../models/mealPlan";

const getInfluencer = async (req: Request, res: Response) => {
  try {
    const influencer = await Influencer.findOne({ user: req.userId });
    if (!influencer) {
      return res.status(404).json({ message: "Influencer not found" });
    }
    res.json(influencer);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error fetching influencer" });
  }
};

const createInfluencer = async (req: Request, res: Response) => {
  try {
    const existingInfluencer = await Influencer.findOne({ user: req.userId });

    if (existingInfluencer) {
      return res
        .status(409)
        .json({ message: "User influencer already exists" });
    }

    const imageUrl = await uploadImage(req.file as Express.Multer.File);

    const influencer = new Influencer(req.body);
    influencer.imageUrl = imageUrl;
    influencer.user = new mongoose.Types.ObjectId(req.userId);
    influencer.lastUpdated = new Date();
    await influencer.save();

    res.status(201).send(influencer);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const updateInfluencer = async (req: Request, res: Response) => {
  try {
    const influencer = await Influencer.findOne({
      user: req.userId,
    });

    if (!influencer) {
      return res.status(404).json({ message: "Influencer not found" });
    }

    influencer.name = req.body.name;
    influencer.bio = req.body.bio;
    influencer.lastUpdated = new Date();

    if (req.file) {
      const imageUrl = await uploadImage(req.file as Express.Multer.File);
      influencer.imageUrl = imageUrl;
    }

    await influencer.save();
    res.status(200).send(influencer);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const getInfluencerMealPlans = async (req: Request, res: Response) => {
  try {
    const influencer = await Influencer.findOne({ user: req.userId });
    if (!influencer) {
      return res.status(404).json({ message: "Influencer not found" });
    }

    const mealPlans = await MealPlan.find({ influencer: influencer._id });

    res.json(mealPlans);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const updateMealPlan = async (req: Request, res: Response) => {
  try {
    const { mealPlanId } = req.params;
    const influencer = await Influencer.findOne({ user: req.userId });
    if (!influencer) {
      return res.status(404).json({ message: "Influencer not found" });
    }

    const mealPlan = await MealPlan.findOne({
      _id: mealPlanId,
      influencer: influencer._id,
    });

    if (!mealPlan) {
      return res.status(404).json({ message: "Meal plan not found" });
    }

    // Update meal plan fields here
    // For example: mealPlan.name = req.body.name;

    await mealPlan.save();
    res.status(200).send(mealPlan);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const uploadImage = async (file: Express.Multer.File) => {
  const image = file;
  const base64Image = Buffer.from(image.buffer).toString("base64");
  const dataURI = `data:${image.mimetype};base64,${base64Image}`;

  const uploadResponse = await cloudinary.v2.uploader.upload(dataURI);
  return uploadResponse.url;
};

export default {
  getInfluencer,
  createInfluencer,
  updateInfluencer,
  getInfluencerMealPlans,
  updateMealPlan,
};
