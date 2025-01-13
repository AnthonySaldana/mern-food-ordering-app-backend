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
    },
  ],
});

export const Match = mongoose.model<MatchDocument>('Match', MatchSchema);