import { Job } from 'bull';
import mealmeapi from '@api/mealmeapi';
import { InventoryItem, InventoryItemType } from '../models/grocery';
// import OpenAI from 'openai';

export const processInventoryJob = async (job: Job) => {
  const { store_id, subcategory_id, latitude, longitude, user_street_num, user_street_name, user_city, user_state, user_zipcode, user_country } = job.data;
  console.log("Processing inventory job for store: ", store_id);
  try {
    mealmeapi.auth(process.env.MEALME_API_KEY as string);

    const response = await mealmeapi.get_inventory_details_v3({
      store_id: store_id as string,
      subcategory_id: subcategory_id as string,
      user_latitude: Number(latitude),
      user_longitude: Number(longitude),
      pickup: false,
      fetch_quotes: false,
      use_new_db: true,
      user_street_num: user_street_num as string,
      user_street_name: user_street_name as string,
      user_city: user_city as string,
      user_state: user_state as string,
      user_zipcode: user_zipcode as string,
      user_country: user_country as string
    });

    console.log(response.data, 'response.data');

    const inventoryItems: InventoryItemType[] = [];

    // Use OpenAI to filter categories
    // const openai = new OpenAI({
    //   apiKey: process.env.OPENAI_API_KEY
    // });
    // const completion = await openai.chat.completions.create({
    //   model: "gpt-4o-mini",
    //   messages: [
    //     {
    //       role: "system",
    //       content: `You are helping identify grocery categories. 
    //       Return only an array of category IDs as json that you determine to be actual grocery categories,
    //       excluding non-grocery items like prepared foods, alcohol, tobacco, etc.
    //       Allow for trending and best seller categories. Return as a json array of category IDs.`
    //     },
    //     {
    //       role: "user",
    //       content: JSON.stringify(response.data.categories.map((cat: any) => ({
    //         id: cat.subcategory_id,
    //         name: cat.name
    //       })))
    //     }
    //   ],
    //   temperature: 0.3,
    //   response_format: { type: "json_object" }
    // });

    // console.log(completion.choices[0].message.content, 'completion.choices[0].message.content');

    // const groceryCategoryIds = JSON.parse(completion.choices[0].message.content!)?.category_ids || [];

    // Process items in current category
    await Promise.all(response.data.categories.flatMap(async (category: any) => {
      // Only process grocery categories
      // if (!groceryCategoryIds.includes(category.subcategory_id)) {
      //   return;
      // }

      // Add subcategories to queue if they exist
      if (category.menu_item_list.length === 0 && category.subcategory_id) {
        await job.queue.add({
          store_id,
          subcategory_id: category.subcategory_id,
          latitude,
          longitude, 
          user_street_num,
          user_street_name,
          user_city,
          user_state,
          user_zipcode,
          user_country
        });
      }

      console.log("Category: ");
      console.log(category);

      category.menu_item_list.map((item: any) => {
        inventoryItems.push({
          store_id,
          product_id: item.product_id,
          name: item.name,
          price: item.price / 100, // Convert cents to dollars
          unit_size: item.unit_size,
          unit_of_measurement: item.unit_of_measurement,
          description: item.description,
          image: item.image,
          is_available: item.is_available
        });
      });
    }));

    // Store inventory items in the database
    // Upsert inventory items - update if exists, insert if new
    await InventoryItem.bulkWrite(
      inventoryItems.map(item => ({
        updateOne: {
          filter: { store_id: item.store_id, product_id: item.product_id },
          update: item,
          upsert: true
        }
      }))
    );

    console.log(`Inventory processed for store: ${store_id}`);
  } catch (error) {
    console.error('Error processing store inventory:', error);
    throw error;
  }
}; 