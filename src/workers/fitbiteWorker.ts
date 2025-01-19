import { Job } from 'bull';
import { InventoryItem } from '../models/grocery';
import { Match } from '../models/match';
import OpenAI from 'openai';

export const processFitbiteJob = async (job: Job) => {
  const { store_id, influencer_id, items } = job.data;
  console.log("Processing fitbite job for store: ", store_id);

  try {
    // Build query conditions
    const conditions = items.map((item: any) => {
      const condition: any = {
        name: { $regex: new RegExp(item.name, 'i') }
      };

      if (item.unit_of_measurement) {
        condition.unit_of_measurement = item.unit_of_measurement;
      }

      if (item.unit_size) {
        condition.unit_size = item.unit_size;
      }

      return condition;
    });

    // Find inventory items matching store and search conditions
    const inventoryItems = await InventoryItem.find({
      store_id: store_id,
      $or: conditions
    }).limit(75);

    // Prepare trimmed data for AI model
    const dataForAI = {
      searchItems: items.map((item: any) => ({
        name: item.name,
        positiveDescriptors: item.positiveDescriptors,
        negativeDescriptors: item.negativeDescriptors,
        quantity: item.quantity
      })),
      inventoryItems: inventoryItems.map((item: any) => ({
        _id: item._id,
        name: item.name
      }))
    };

    const openai = new OpenAI();
    // Call OpenAI API to find best matches
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `You are a helpful assistant that matches grocery items based on names and attributes. Match the following search items with the best inventory and determine the appropriate quantity for each item.
          Only return 1 match for each search item. The search items have positive and negative descriptors that you should use to match the inventory items.
          Do not include items that have matching negative descriptors. Include items that have matching positive descriptors.
          items based on name and other attributes. Return the best matches in the following JSON format:
          {
            matches: [
              {
                ...name and _id from data
                adjusted_quantity: number // the quantity determined by AI
              }
            ]
          }
          ${JSON.stringify(dataForAI)}`
        }
      ],
      temperature: 1,
    });

    const aiResponse = completion.choices[0];
    let content = aiResponse.message.content || '{}';
    if (content.startsWith('```json')) {
      content = content.slice(7, -3);
    }
    const parsedMatches = JSON.parse(content) || { matches: [] };
    const bestMatches = parsedMatches.matches.map((match: any) => {
      const inventoryItem = inventoryItems.find(item => item._id.toString() === match._id);
      return {
        ...match,
        ...inventoryItem?.toObject(),
        adjusted_quantity: match.adjusted_quantity,
      };
    });

    // Update existing match or create new one using upsert
    await Match.findOneAndUpdate(
      { store_id, influencer_id },
      { 
        store_id,
        influencer_id,
        matches: bestMatches
      },
      { upsert: true, new: true }
    );

    console.log('Matches saved/updated in the database');
  } catch (error) {
    console.error('Error processing fitbite job:', error);
    throw error;
  }
};