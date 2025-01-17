// src/models/Recommendation.js

import mongoose, { Schema, Document } from 'mongoose';

export const recommendationSchema = new Schema({
    id: { type: Number, unique: true, autoIncrement: true },
    creatorName: { type: String, required: true },
  });

export default mongoose.model("Recommendation", recommendationSchema);
