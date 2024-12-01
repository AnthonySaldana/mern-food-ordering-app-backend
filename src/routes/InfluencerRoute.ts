import express from "express";
import multer from "multer";
import { param } from "express-validator";
import InfluencerController from "../controllers/InfluencerController";
import { jwtCheck, jwtParse } from "../middleware/auth";
import { validateInfluencerRequest } from "../middleware/validation";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, //5mb
  },
})

upload.fields([
  { name: "imageFile", maxCount: 1 }, // For the base influencer image
  { name: 'mealPlans[0][imageFile]', maxCount: 1 },
  { name: 'mealPlans[0][menuItems][0][imageFile]', maxCount: 10 }
]);

router.get(
  "/mealplans",
  jwtCheck,
  jwtParse,
  InfluencerController.getInfluencerMealPlans
);

router.patch(
  "/mealplan/:mealPlanId",
  param("mealPlanId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("MealPlanId parameter must be a valid string"),
  jwtCheck,
  jwtParse,
  InfluencerController.updateMealPlan
);

router.get("/", jwtCheck, jwtParse, InfluencerController.getInfluencer);

router.get(
  "/:influencerId",
  param("influencerId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("InfluencerId parameter must be a valid string"),
  InfluencerController.getInfluencerById
);

router.get(
  "/search/:city",
  param("city")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("City parameter must be a valid string"),
  InfluencerController.searchInfluencer
);

router.post(
  "/",
  upload.any(),
  validateInfluencerRequest,
  jwtCheck,
  jwtParse,
  InfluencerController.createInfluencer
);

router.put(
  "/",
  upload.any(),
  validateInfluencerRequest,
  jwtCheck,
  jwtParse,
  InfluencerController.updateInfluencer
);

export default router;
