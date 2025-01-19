import mongoose, { Schema, Document } from 'mongoose';

interface MatchDocument extends Document {
  store_id: string;
  influencer_id: string;
  matches: Array<{
    _id: string;
    name: string;
    adjusted_quantity: number;
  }>;
}

const MatchSchema: Schema = new Schema({
  store_id: { type: String, required: true },
  influencer_id: { type: String, required: true },
  matches: [
    {
      _id: { type: String, required: true },
      name: { type: String, required: true },
      adjusted_quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      image: { type: String, required: true },
      is_available: { type: Boolean, required: true },
    },
  ],
});

// Create a compound index on store_id and influencer_id to ensure uniqueness
MatchSchema.index({ store_id: 1, influencer_id: 1 }, { unique: true });

export const Match = mongoose.model<MatchDocument>('Match', MatchSchema);