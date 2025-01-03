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
    // Check if influencer already exists
    const existingInfluencer = await Influencer.findOne({
      user: req.userId,
    });

    if (existingInfluencer) {
      return res.status(400).json({ message: "Influencer already exists" });
    }

    // Create new influencer
    const influencer = new Influencer({
      user: req.userId,
      ...req.body,
      lastUpdated: new Date()
    });

    if (req.files && Array.isArray(req.files)) {
      const imageFile = req.files.find(file => file.fieldname === 'imageFile');
      if (imageFile) {
        const imageUrl = await uploadImage(imageFile);
        influencer.imageUrl = imageUrl;
      }
    }

    const mealPlans = req.body.mealPlans || [];
    for (let i = 0; i < mealPlans.length; i++) {
      const mealPlan = mealPlans[i];
      const menuItems = mealPlan.menuItems || [];

      // Upload meal plan image if available
      if (req.files && Array.isArray(req.files)) {
        const mealPlanImageFile = req.files.find(file => file.fieldname === `mealPlans[${i}][imageFile]`);
        if (mealPlanImageFile) {
          try {
            const uploadedImageUrl = await uploadImage(mealPlanImageFile as Express.Multer.File);
            mealPlans[i].imageUrl = uploadedImageUrl;
          } catch (err) {
            console.log("Error uploading meal plan image:", err);
          }
        }
      }
      
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
    res.status(201).json(influencer);
  } catch (error) {
    console.log("error", error);
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

    const existingInfluencer = JSON.parse(JSON.stringify(influencer));

    Object.assign(influencer, req.body);
    influencer.lastUpdated = new Date();

    if (req.files && Array.isArray(req.files)) {
      console.log("update base image");
      const imageFile = req.files.find(file => file.fieldname === 'imageFile');
      if (imageFile) {
        const imageUrl = await uploadImage(imageFile);
        influencer.imageUrl = imageUrl;
      }
    }

    const mealPlans = req.body.mealPlans || [];
    for (let i = 0; i < mealPlans.length; i++) {
      const mealPlan = mealPlans[i];
      const existingMealPlan = existingInfluencer.mealPlans[i] || {};
      const menuItems = mealPlan.menuItems || [];

      mealPlans[i].imageUrl = existingMealPlan.imageUrl;

      if (req.files && Array.isArray(req.files)) {
        const mealPlanImageFile = req.files.find(file => file.fieldname === `mealPlans[${i}][imageFile]`);
        if (mealPlanImageFile) {
          try {
            const uploadedImageUrl = await uploadImage(mealPlanImageFile as Express.Multer.File);
            mealPlans[i].imageUrl = uploadedImageUrl;
          } catch (err) {
            console.log("Error uploading meal plan image:", err);
          }
        }
      }

      for (let j = 0; j < menuItems.length; j++) {
        const menuItem = menuItems[j];
        const existingMenuItem = existingMealPlan.menuItems[j] || {};
        menuItems[j].imageUrl = existingMenuItem.imageUrl; // Default to existing image URL

        if (req.files && Array.isArray(req.files)) {
          const imageFile = req.files?.find(file => file.fieldname === `mealPlans[${i}][menuItems][${j}][imageFile]`);

          if (imageFile) {
            try {
              const uploadedImageUrl = await uploadImage(imageFile as Express.Multer.File);
              menuItems[j] = { ...menuItem, imageUrl: uploadedImageUrl };
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
    query["active"] = { $ne: false }; // Ensure active is not set to false

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

    const pageSize = 20;
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
