import express from "express";
import multer from "multer";
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
});

router.get(
  "/mealplans",
  jwtCheck,
  jwtParse,
  InfluencerController.getInfluencerMealPlans
);

router.patch(
  "/mealplan/:mealPlanId",
  jwtCheck,
  jwtParse,
  InfluencerController.updateMealPlan
);

router.get("/", jwtCheck, jwtParse, InfluencerController.getInfluencer);

router.post(
  "/",
  upload.single("imageFile"),
  validateInfluencerRequest,
  jwtCheck,
  jwtParse,
  InfluencerController.createInfluencer
);

router.put(
  "/",
  upload.single("imageFile"),
  validateInfluencerRequest,
  jwtCheck,
  jwtParse,
  InfluencerController.updateInfluencer
);

export default router;
