import { Request, Response } from "express";
import Influencer, { MenuItem } from "../models/influencer";
import cloudinary from "cloudinary";
import mongoose from "mongoose";
import MealPlan from "../models/mealplan";

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

const getInfluencerById = async (req: Request, res: Response) => {
  try {
    const influencer = await Influencer.findById(req.params.influencerId);
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

    console.log("influencer", influencer?.mealPlans[0]?.menuItems[0]);

    if (!influencer) {
      return res.status(404).json({ message: "Influencer not found" });
    }

    Object.assign(influencer, req.body);
    influencer.lastUpdated = new Date();
    if (req.files && Array.isArray(req.files)) {
      const imageFile = req.files.find(file => file.fieldname === 'imageFile');
      if (imageFile) {
        const imageUrl = await uploadImage(imageFile);
        influencer.imageUrl = imageUrl;
      }
    }

    // Upload images for menu items if available
    // Upload images for menu items within meal plans if available
    console.log("req", req);
    console.log("req.body", req.body);
    console.log("req.body", req.body.mealPlans[0]);
    console.log("req.files", req.files);
    const mealPlans = req.body.mealPlans || [];
    for (let i = 0; i < mealPlans.length; i++) {
      const mealPlan = mealPlans[i];
      const menuItems = mealPlan.menuItems || [];

      console.log("menuItems", menuItems);
      
      for (let j = 0; j < menuItems.length; j++) {
        const menuItem = menuItems[j];
        if (req.files && Array.isArray(req.files)) {
          const imageFile = req.files?.find(file => file.fieldname === `mealPlans[${i}][menuItems][${j}][imageFile]`);

          if (imageFile) {
            try {
              const uploadedImageUrl = await uploadImage(imageFile as Express.Multer.File);
              menuItems[j] = { ...menuItem, imageUrl: uploadedImageUrl };
              delete menuItems[j].imageFile;
            } catch (err) {
              console.log("Error uploading menu item image:", err);
            }
          }
        }
      }
      mealPlans[i].menuItems = menuItems;
    }
    influencer.mealPlans = mealPlans;

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

const searchInfluencer = async (req: Request, res: Response) => {
  try {
    const city = req.params.city;

    const searchQuery = (req.query.searchQuery as string) || "";
    const selectedCuisines = (req.query.selectedCuisines as string) || "";
    const sortOption = (req.query.sortOption as string) || "lastUpdated";
    const page = parseInt(req.query.page as string) || 1;

    let query: any = {};

    query["city"] = new RegExp(city, "i");
    const cityCheck = await Influencer.countDocuments(query);
    if (cityCheck === 0) {
      return res.status(404).json({
        data: [],
        pagination: {
          total: 0,
          page: 1,
          pages: 1,
        },
      });
    }

    if (selectedCuisines) {
      const cuisinesArray = selectedCuisines
        .split(",")
        .map((cuisine) => new RegExp(cuisine, "i"));

      query["cuisines"] = { $all: cuisinesArray };
    }

    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, "i");
      query["$or"] = [
        { name: searchRegex },
        { cuisines: { $in: [searchRegex] } },
      ];
    }

    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const influencers = await Influencer.find(query)
      .sort({ [sortOption]: 1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const total = await Influencer.countDocuments(query);

    const response = {
      data: influencers,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / pageSize),
      },
    };

    res.json(response);
  } catch (error) {
    console.log(error);
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
  getInfluencerById,
  searchInfluencer,
};
