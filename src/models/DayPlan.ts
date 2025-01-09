import mongoose, { Schema, Document } from 'mongoose';

interface DayPlan extends Document {
  date: Date;
  recipes: Array<Schema.Types.ObjectId>;
  influencer: Schema.Types.ObjectId;
}

const DayPlanSchema: Schema = new Schema({
  date: { type: Date, required: true },
  recipes: [{ type: Schema.Types.ObjectId, ref: 'Recipe' }],
  influencer: { type: Schema.Types.ObjectId, ref: 'Influencer', required: true },
});

export default mongoose.model<DayPlan>('DayPlan', DayPlanSchema);
