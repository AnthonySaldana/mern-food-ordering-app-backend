import { Job } from 'bull';
import { InventoryItem } from '../models/grocery';
import { Match } from '../models/match';
import OpenAI from 'openai';

export const processFitbiteJob = async (job: Job) => {
  const { store_id, influencer_id, items } = job.data;

  try {
    // Function to split items into chunks of a specified size
    const chunkArray = (array: any[], chunkSize: number) => {
      const chunks = [];
      for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
      }
      return chunks;
    };

    // Split items into chunks of 15
    const itemChunks = chunkArray(items, 1);

    let allBestMatches: any[] = [];
    const matchedItemNames = new Set(); // Track matched item names instead of IDs

    for (const chunk of itemChunks) {
      // Build query conditions for each chunk
      const conditions = chunk.map((item: any) => {
        const condition: any = {
          // $text: { $search: item.name, $caseSensitive: false } // Fuzzy text search on name
          name: { $regex: item.name, $options: 'i' }
          // name: { $eq: item.name } // Exact match on name using $eq operator
        };

        if (item.unit_of_measurement) {
          condition.unit_of_measurement = item.unit_of_measurement;
        }

        if (item.unit_size) {
          condition.unit_size = item.unit_size;
        }

        // Exclude items with negative descriptors
        // if (item.negativeDescriptors && item.negativeDescriptors.length > 0) {
        //   condition.name = { 
        //     $not: { 
        //       $regex: item.negativeDescriptors, 
        //       $options: 'i' // Case-insensitive matching
        //     },
        //   };
        // }

        return condition;
      });
      
      console.log("conditions conditions conditions", conditions);

      // For each item in the chunk, find the best matching inventory item
      for (let i = 0; i < chunk.length; i++) {
        const item = chunk[i];
        const condition = conditions[i];
        
        // Only search if we haven't already found a match for this item name
        if (!matchedItemNames.has(item.name)) {
          // Find the single best matching inventory item
          const bestMatch = await InventoryItem.findOne({
            store_id: store_id,
            ...condition
          }); //.sort({ score: { $meta: "textScore" } });

          if (bestMatch) {
            matchedItemNames.add(item.name); // Add original item name to matched names
            allBestMatches.push({
              _id: bestMatch._id,
              name: bestMatch.name,
              price: bestMatch.price,
              adjusted_quantity: 1
            });
          }
        }
      }
    }

    // Update existing match or create new one using upsert
    await Match.findOneAndUpdate(
      { store_id, influencer_id },
      { 
        store_id,
        influencer_id,
        matches: allBestMatches
      },
      { upsert: true, new: true }
    );

    console.log('Matches saved/updated in the database');
  } catch (error) {
    console.error('Error processing fitbite job:', error);
    throw error;
  }
};

export const deprProcessFitbiteJob = async (job: Job) => {
  const { store_id, influencer_id, items } = job.data;
  // console.log("Processing fitbite job for store: ", store_id);
  // console.log("Items: ");
  // console.log(items);
  // console.log(items.length, 'items length');

  try {
    // Function to split items into chunks of a specified size
    const chunkArray = (array: any[], chunkSize: number) => {
      const chunks = [];
      for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
      }
      return chunks;
    };

    // Split items into chunks of 15
    const itemChunks = chunkArray(items, 15);

    // console.log("Item chunks: ");
    // console.log(itemChunks);

    let allBestMatches: any[] = [];

    for (const chunk of itemChunks) {
      // Build query conditions for each chunk
      const conditions = chunk.map((item: any) => {
        const nameParts = item.name.split(' ');
        const nameRegexes = [
          ...nameParts.map((part: any) => new RegExp(part, 'i')),
          new RegExp(item.name, 'i')
        ];
        const condition: any = {
          name: { $in: nameRegexes.map((regex: any) => ({ $regex: regex })) }
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
      }).limit(200);

      // Prepare trimmed data for AI model
      const dataForAI = {
        searchItems: chunk.map((item: any) => ({
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
      const bestMatches = parsedMatches.matches
        .filter((match: any, index: number, self: any[]) => 
          index === self.findIndex((m: any) => m._id === match._id)
        )
        .map((match: any) => {
          const inventoryItem = inventoryItems.find(item => item._id.toString() === match._id);
          return {
            ...match,
            ...inventoryItem?.toObject(),
            price: inventoryItem?.price,
            adjusted_quantity: match.adjusted_quantity,
          };
        });

      // Combine results from all chunks
      allBestMatches = allBestMatches.concat(bestMatches);
    }

    // Update existing match or create new one using upsert
    await Match.findOneAndUpdate(
      { store_id, influencer_id },
      { 
        store_id,
        influencer_id,
        matches: allBestMatches
      },
      { upsert: true, new: true }
    );

    console.log('Matches saved/updated in the database');
  } catch (error) {
    console.error('Error processing fitbite job:', error);
    throw error;
  }
};