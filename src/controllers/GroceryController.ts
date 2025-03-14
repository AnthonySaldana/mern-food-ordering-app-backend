import { Request, Response } from 'express';
import mealmeapi from '@api/mealmeapi';
import { ShoppingListItemType, ShoppingListType, ShoppingList, ShoppingListItem } from '../models/grocery';
import { Order } from '../models/order';
import User, { UserRole } from '../models/user';
import { InventoryItem } from '../models/grocery';
import { StoreProcessingStatus } from '../models/grocery';
import inventoryQueue from '../queues/inventoryQueue';
import OpenAI from "openai"
import sgMail from '@sendgrid/mail';
import Store from '../models/store';

const MEALME_API_KEY = process.env.MEALME_API_KEY as string;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY as string;

interface StoreMatch {
  store_id: string;
  store_name: string;
  matchedItems: Array<{
    requestedItem: ShoppingListItemType;
    foundProduct: any; // MealMe product type
    price: number;
  }>;
  missingItems: ShoppingListItemType[];
  totalPrice: number;
  matchPercentage: number;
}

function analyzeStoreMatches(itemAvailability: any[]): StoreMatch[] {
  const storeMap = new Map<string, StoreMatch>();
  
  itemAvailability.forEach(({requestedItem, availableProducts, stores}) => {
    stores.forEach((store: any) => {
      const storeProducts = availableProducts.filter((p: any) => p.store_id === store._id);
      
      if (!storeMap.has(store._id)) {
        storeMap.set(store._id, {
          store_id: store._id,
          store_name: store.name,
          matchedItems: [],
          missingItems: [],
          totalPrice: 0,
          matchPercentage: 0
        });
      }

      const storeMatch = storeMap.get(store._id)!;
      
      if (storeProducts.length > 0) {
        // Find best matching product (could be enhanced with brand matching)
        const bestMatch = storeProducts[0];
        storeMatch.matchedItems.push({
          requestedItem,
          foundProduct: bestMatch,
          price: bestMatch.price
        });
        storeMatch.totalPrice += bestMatch.price * requestedItem.quantity;
      } else {
        storeMatch.missingItems.push(requestedItem);
      }
    });
  });

  // Calculate match percentages
  for (const storeMatch of storeMap.values()) {
    const totalItems = storeMatch.matchedItems.length + storeMatch.missingItems.length;
    storeMatch.matchPercentage = Math.round((storeMatch.matchedItems.length / totalItems) * 100);
  }

  return Array.from(storeMap.values())
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}

const searchGroceryStores = async (req: Request, res: Response) => {
  try {
    const {
      query = '',
      latitude,
      longitude, 
      budget = 100,
      maximumMiles = 10,
      open = false,
      pickup = false,
      sort = 'relevance',
      search_focus = 'store',
      user_street_num = '123',
      user_street_name = 'Main St',
      user_city = 'Anytown',
      user_state = 'CA',
      user_zipcode = '12345',
      user_country = 'US'
    } = req.query;

    // Validate required parameters
    if (!latitude || !longitude || latitude === '0' || longitude === '0') {
      console.warn('Missing required parameters for grocery store search');
      return res.status(400).json({ 
        warning: true,
        message: 'Latitude and longitude are required parameters'
      });
    }

    // First try to find stores in MongoDB
    const lat = Number(latitude);
    const lng = Number(longitude);
    const maxDistanceInMiles = Number(maximumMiles);

    let stores = await Store.find({
      'address.latitude': { $gte: lat - 0.5, $lte: lat + 0.5 },
      'address.longitude': { $gte: lng - 0.5, $lte: lng + 0.5 },
      'last_updated': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Within last 7 days
    }).limit(100);

    // If no stores found or data is stale, fetch from MealMe
    if (stores.length === 0) {
      console.log("No stores found in database, calling MealMe API");
      
      mealmeapi.auth(MEALME_API_KEY);
      const response = await mealmeapi.get_search_store_v3({
        query: query as string,
        latitude: lat,
        longitude: lng,
        store_type: 'grocery',
        budget: Number(budget),
        maximum_miles: maxDistanceInMiles,
        search_focus: search_focus as string,
        sort: sort as string,
        pickup: pickup === 'true',
        fetch_quotes: false,
        open: false,
        default_quote: false,
        autocomplete: false,
        include_utc_hours: false,
        projections: '_id,name,address,type,is_open,miles',
        use_new_db: true,
        user_street_num: user_street_num as string,
        user_street_name: user_street_name as string,
        user_city: user_city as string,
        user_state: user_state as string,
        user_zipcode: user_zipcode as string,
        user_country: user_country as string
      });
      // Filter and store results in MongoDB
      const filteredStores = response.data.stores.filter((store: any) => 
        ( !store.name.toLowerCase().includes('liquor') &&
        !store.name.toLowerCase().includes('pet') &&
        !store.name.toLowerCase().includes('pharmacy') &&
        !store.name.toLowerCase().includes('health') &&
        !store.name.toLowerCase().includes('beauty') &&
        !store.name.toLowerCase().includes('hair') &&
        !store.name.toLowerCase().includes('nail') &&
        !store.name.toLowerCase().includes('spa') &&
        !store.name.toLowerCase().includes('clinic') &&
        !store.name.toLowerCase().includes('doctor') &&
        !store.name.toLowerCase().includes('dentist') &&
        !store.name.toLowerCase().includes('vet') &&
        !store.name.toLowerCase().includes('veterinary') &&
        !store.name.toLowerCase().includes('animal') &&
        !store.name.toLowerCase().includes('pet') )
      );

      // Bulk upsert stores
      const bulkOps = filteredStores.map((store: any) => ({
        updateOne: {
          filter: { _id: store._id },
          update: {
            $set: {
              name: store.name,
              type: store.type,
              address: store.address,
              is_open: store.is_open,
              miles: store.miles,
              last_updated: new Date()
            }
          },
          upsert: true
        }
      }));

      if (bulkOps.length > 0) {
        await Store.bulkWrite(bulkOps);
      }

      return res.json({
        ...response.data,
        stores: filteredStores
      });
    } else {
      console.log("Stores found in database");
    }

    // Return stores from database
    return res.json({
      stores: stores.map(store => ({
        _id: store._id,
        name: store.name,
        type: store.type,
        address: store.address,
        is_open: store.is_open,
        miles: store.miles
      }))
    });

  } catch (error) {
    console.warn('Error searching grocery stores:', error);
    res.status(400).json({ 
      warning: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred while searching grocery stores'
    });
  }
};

const searchProducts = async (req: Request, res: Response) => {
  try {
    mealmeapi.auth(MEALME_API_KEY);

    const {
      query = '',
      latitude,
      longitude,
      budget = 20,
      maximumMiles = 5,
      streetNum,
      streetName,
      city,
      state,
      zipcode,
      country = 'US'
    } = req.query;

    const response = await mealmeapi.get_search_product_v4({
      query: query as string,
      user_latitude: Number(latitude),
      user_longitude: Number(longitude),
      pickup: false,
      budget: Number(budget),
      user_street_num: streetNum as string,
      user_street_name: streetName as string,
      user_city: city as string,
      user_state: state as string,
      user_zipcode: zipcode as string,
      user_country: country as string,
      fetch_quotes: false,
      sort: 'relevance',
      fuzzy_search: false,
      open: false,
      maximum_miles: Number(maximumMiles),
      sale: false,
      autocomplete: true,
      use_new_db: true,
      store_type: 'grocery'
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Error searching products' });
  }
};

const getGeolocation = async (req: Request, res: Response) => {
  try {
    mealmeapi.auth(MEALME_API_KEY);

    const { address } = req.body;

    const response = await mealmeapi.post_geocode_address_v2({
      address: address
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error getting geolocation:', error);
    res.status(500).json({ message: 'Error getting geolocation' });
  }
};

const processGroceryOrder = async (orderData: any) => {
  mealmeapi.auth(MEALME_API_KEY);
  const response = await mealmeapi.post_order_v3(orderData);
  return response.data;
};

const createGroceryOrderDepr = async (req: Request, res: Response) => {
  try {
    // Validate required fields
    const { store_id, items, delivery_details, payment_details } = req.body;
    
    if (!store_id || !items || !delivery_details || !payment_details) {
      return res.status(400).json({ 
        message: 'Missing required fields: store_id, items, delivery_details, or payment_details' 
      });
    }

    if (!payment_details.payment_method_id) {
      return res.status(400).json({
        message: 'Missing payment_method_id in payment_details'
      });
    }

    const orderData = {
      store_id,
      items: items.map((item: any) => ({
        item_id: item.id,
        quantity: item.quantity,
        special_instructions: item.instructions
      })),
      delivery: {
        address: delivery_details.address,
        latitude: delivery_details.latitude,
        longitude: delivery_details.longitude,
        instructions: delivery_details.instructions
      },
      payment: {
        payment_method_id: payment_details.payment_method_id,
        tip: payment_details.tip_amount || 0
      },
      scheduled_time: req.body.scheduled_time || undefined,
      pickup: false,
      place_order: true,
      user_email: "test@test.com", // TODO: Get from authenticated user
      user_id: "123", // TODO: Get from authenticated user
      user_phone: 1234567890, // TODO: Get from authenticated user
      user_name: "Test User"
    };

    const response = await processGroceryOrder(orderData);
    res.json(response);
  } catch (error) {
    console.error('Error creating grocery order:', error);
    res.status(500).json({ message: 'Error creating grocery order' });
  }
};

const findStoresForShoppingList = async (req: Request, res: Response) => {
  try {
    mealmeapi.auth(MEALME_API_KEY);
    const { shoppingListId, latitude, longitude, maximumMiles = 3 } = req.query;
    
    // 1. Get shopping list from database
    const shoppingList = await ShoppingList.findById(shoppingListId);
    
    if (!shoppingList) {
      return res.status(404).json({ message: 'Shopping list not found' });
    }
    
    // 2. Search for each item in nearby stores
    const itemAvailability = await Promise.all(
      shoppingList.items.map(async (item) => {
        const response = await mealmeapi.get_search_product_v4({
          query: item.name,
          user_latitude: Number(latitude),
          user_longitude: Number(longitude),
          maximum_miles: Number(maximumMiles),
          pickup: false,
          fetch_quotes: false,
          sort: 'relevance',
          use_new_db: true
        });
        
        return {
          requestedItem: item,
          availableProducts: response.data.products,
          stores: response.data.stores
        };
      })
    );

    // 3. Analyze and group by store for best matches
    const storeMatches = analyzeStoreMatches(itemAvailability);
    
    res.json(storeMatches);
  } catch (error) {
    console.error('Error finding stores for shopping list:', error);
    res.status(500).json({ message: 'Error processing shopping list' });
  }
};

const createShoppingListOrder = async (req: Request, res: Response) => {
  try {
    const { storeMatch, delivery_details, payment_details } = req.body;
    
    const orderData = {
      store_id: storeMatch.store_id,
      items: storeMatch.matchedItems.map((match: any) => ({
        item_id: match.foundProduct.id,
        quantity: match.requestedItem.quantity,
        special_instructions: ''
      })),
      delivery: delivery_details,
      payment: payment_details
    };

    const response = await processGroceryOrder(orderData);
    res.json(response);
  } catch (error) {
    console.error('Error creating shopping list order:', error);
    res.status(500).json({ message: 'Error creating order from shopping list' });
  }
};

const getStoreInventory = async (req: Request, res: Response) => {
  try {
    mealmeapi.auth(MEALME_API_KEY);

    const {
      store_id,
      subcategory_id,
      latitude,
      longitude,
      user_street_num,
      user_street_name,
      user_city,
      user_state,
      user_zipcode,
      user_country
    } = req.query;

    const response = await mealmeapi.get_inventory_details_v3({
      store_id: store_id as string,
      subcategory_id: subcategory_id as string || undefined,
      user_latitude: Number(latitude),
      user_longitude: Number(longitude),
      pickup: false,
      fetch_quotes: false,
      user_street_num: user_street_num as string,
      user_street_name: user_street_name as string,
      user_city: user_city as string,
      user_state: user_state as string,
      user_zipcode: user_zipcode as string,
      user_country: user_country as string,
      // include_quote: !subcategory_id, // Only include final quote on first request when no subcategory is specified
      include_quote: false,
      use_new_db: true
    });

    console.log(response.data, 'response.data');

    // Transform the response to a more usable format
    const inventory = {
      menu_id: response.data.menu_id,
      categories: response.data.categories.map(category => ({
        name: category.name,
        subcategory_id: category.subcategory_id,
        has_subcategories: category.menu_item_list.length === 0,
        items: category.menu_item_list.map(item => ({
          id: item.product_id,
          name: item.name,
          price: item.price / 100, // Convert cents to dollars
          unit_size: item.unit_size,
          unit_of_measurement: item.unit_of_measurement,
          description: item.description,
          image: item.image,
          is_available: item.is_available
        }))
      })),
      quote: response.data.quote || {}
    };

    res.json(inventory);
  } catch (error) {
    console.error('Error fetching store inventory:', error);
    res.status(500).json({ message: 'Error fetching store inventory' });
  }
};

const getFitbiteInventory = async (req: Request, res: Response) => {
  try {
    const { store_id, items } = req.body;

    if (!store_id || !items) {
      return res.status(400).json({ message: 'store_id and items are required' });
    }

    console.log(store_id, items, 'store_id and items');

    // Parse items array from query string
    // const searchItems = JSON.parse(items as string);

    console.log(items, 'searchItems');

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

    console.log(dataForAI, 'dataForAI');

    const openai = new OpenAI();
    // Call OpenAI API to find best matches
    const completion = await openai.chat.completions.create({
      model: "o1-mini",
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
                adjusted_quantity: number // the quantity determied by AI
              }
            ]
          }
          ${JSON.stringify(dataForAI)}`
        }
      ],
      temperature: 1,
    });

    const aiResponse = completion.choices[0];
    console.log(aiResponse, 'aiResponse');

    // Process AI response
    let content = aiResponse.message.content || '{}';
    if (content.startsWith('```json')) {
      // TODO: Use gpt json response mode instead of this
      content = content.slice(7, -3);
    }
    console.log(content, 'content after stripping');
    const parsedMatches = JSON.parse(content) || { matches: [] };
    const bestMatches = parsedMatches.matches.map((match: any) => {
      const inventoryItem = inventoryItems.find(item => item._id.toString() === match._id);
      return {
        ...match,
        ...inventoryItem?.toObject(),
        adjusted_quantity: match.adjusted_quantity
      };
    });

    // Filter out duplicates based on _id
    // const uniqueMatches = bestMatches.filter((match: any, index: number, self: any[]) =>
    //   index === self.findIndex((m: any) => m._id === match._id)
    // );

    console.log(bestMatches, 'bestMatches');

    // Format response
    // const inventory = {
    //   store_id,
    //   items: inventoryItems.map(item => ({
    //     id: item.product_id,
    //     name: item.name,
    //     price: item.price,
    //     unit_size: item.unit_size,
    //     unit_of_measurement: item.unit_of_measurement,
    //     description: item.description,
    //     image: item.image,
    //     is_available: item.is_available
    //   }))
    // };

    // const inventory = {
    //   store_id,
    //   items: bestMatches?.matches.map((item: any) => ({
    //     id: item._id,
    //     name: item.name,
    //     price: item.price,
    //     unit_size: item.unit_size,
    //     unit_of_measurement: item.unit_of_measurement,
    //     description: item.description,
    //     image: item.image,
    //     is_available: item.is_available
    //   }))
    // };

    res.json({ matches: bestMatches });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ message: 'Error fetching inventory items' });
  }
};


const createGroceryOrder = async (req: Request, res: Response) => {
  try {
    const { store_id, items, delivery_details, place_order, final_quote, payment_details, influencer_id, meal_plan_name, plan_start_day, username } = req.body;
    
    mealmeapi.auth(MEALME_API_KEY);

    console.log(delivery_details, 'delivery_details');

    console.log(username, 'username');

    const calculatedUserName = username?.includes(' ') ? 
      username.split(' ').map((name: string) => name.length === 1 ? name + name : name).join(' ') : 
      username + " Guest" || delivery_details.user_email + " Guest"

    console.log(calculatedUserName, 'calculatedUserName');

    // Get user record from database
    const user = await User.findOne({ email: delivery_details.user_email });
    const userId = user?._id || 'guest';

    console.log(userId, 'userId');
    console.log(user, 'user');
    
    const orderResponse = await mealmeapi.post_order_v3({
      items,
      place_order,
      final_quote,
      pickup: false,
      driver_tip_cents: delivery_details.tip_amount * 10 || 0,
      pickup_tip_cents: 0,
      user_latitude: delivery_details.latitude,
      user_longitude: delivery_details.longitude,
      user_street_num: delivery_details.street_num,
      user_street_name: delivery_details.street_name,
      user_city: delivery_details.city,
      user_state: delivery_details.state,
      user_country: delivery_details.country || 'US',
      user_zipcode: delivery_details.zipcode,
      user_dropoff_notes: delivery_details.instructions,
      user_email: delivery_details.user_email || 'admin@fitbite.app', // TODO: Get from user profile
      user_id: userId, // TODO: Get from user profile 
      user_name: calculatedUserName,
      user_phone: 5622043228, // TODO: Get from user profile
      charge_user: true,
      include_final_quote: true,
      disable_sms: false,
      email_receipt_specifications: {
        prices_marked: false,
        added_fee: {added_fee_flat: 2000, added_fee_percent: 0},
        unify_service_fee: true,
        disable_email: false
      },
      favorited: false,
      enable_substitution: true,
      autofill_selected_options: true,
    });

    console.log(orderResponse.data, 'orderResponse.data');

    // Store order in our database
    const order = new Order({
      user: req.userId,
      user_id: userId,
      store_id,
      items,
      deliveryDetails: delivery_details,
      mealme_order_id: orderResponse.data.order_id,
      status: 'inProgress',
      total: orderResponse.data.final_quote.total_with_tip,
      subtotal: orderResponse.data.subtotal,
      quote: orderResponse.data.final_quote.quote,
      added_fees: orderResponse.data.final_quote.added_fees,
      tax: orderResponse.data.tax,
      delivery_fee: orderResponse.data.delivery_fee,
      service_fee: orderResponse.data.service_fee,
      driver_tip: delivery_details.tip_amount || 0,
      platform_fee: orderResponse.data.platform_fee,
      processing_fee: orderResponse.data.processing_fee,
      influencer_id, // influencer reference
      meal_plan_name, // Add meal plan name for reference #todo change to id reference?
      plan_start_day,
    });

    console.log(order, 'order');
    
    const tracking_link = `https://tracking.mealme.ai/tracking?id=${orderResponse.data.order_id}`;
    await order.save();

    console.log(SENDGRID_API_KEY, 'SENDGRID_API_KEY');

    sgMail.setApiKey(SENDGRID_API_KEY)
    const msg = {
      to: delivery_details.user_email, // Change to your recipient
      from: 'support@fitbite.app', // Change to your verified sender
      subject: 'Your order has been placed',
      text: 'Your order has been placed',
      html: `
        <div style="background-color: #f5f5f5; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 40px; font-family: Arial, sans-serif; text-align: center;">
            <img src="https://www.fitbite.app/logo.png" alt="FitBite Logo" style="width: 150px; height: auto; margin-bottom: 20px;">
            <h2 style="color: #2b2b2b; margin-top: 0;">Great news! Your FitBite order is on its way! 🎉</h2>
            <p style="color: #666; margin: 20px 0;">Stay updated on your delivery progress in real-time with our order tracking system.</p>
            <a href="${tracking_link}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Track Your Order</a>
            
            <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 30px;">
              <p style="color: #666; margin: 20px 0;">Ready to start your culinary journey? Access your personalized recipe guide to create delicious, healthy meals with your fresh ingredients!</p>
              <a href="https://www.fitbite.app/recipe/${influencer_id}/mealplan/0" style="display: inline-block; background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0;">View Your Recipes</a>
            </div>

            <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 30px;">
              <h3 style="color: #666; margin: 20px 0;">Your meal plan: <strong>${meal_plan_name}</strong></h3>
              <p style="color: #666; margin: 20px 0;">Love your meal plan? Order it again with just one click!</p>
              <a href="https://www.fitbite.app/influencer/${influencer_id}/mealplans/0?store_id=${store_id}" style="display: inline-block; background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Reorder This Meal Plan</a>
            </div>
          </div>
        </div>
      `,
    }
    sgMail
      .send(msg)
      .then(() => {
        console.log('Email sent')
      })
      .catch((error) => {
        console.error(error, 'error for sendgrid');
        console.error(error.response.body, 'error.response.body');
      })

    res.json(orderResponse.data);
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: error?.data.error || 'Error creating order' });
  }
};

const finalizeOrder = async (req: Request, res: Response) => {
  try {
    const { order_id } = req.body;
    
    mealmeapi.auth(MEALME_API_KEY);
    
    const response = await mealmeapi.post_confirm_order({
      order_id
    });

    // Update order status in our database
    await Order.findOneAndUpdate(
      { mealme_order_id: order_id },
      { status: 'confirmed' }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error finalizing order:', error);
    res.status(500).json({ message: 'Error finalizing order' });
  }
};

const createPaymentMethod = async (req: Request, res: Response) => {
  try {
    mealmeapi.auth(MEALME_API_KEY);
    
    const { card_number, exp_month, exp_year, cvc, email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find existing user or create new guest user
    let user = await User.findOne({ email });
    
    if (!user) {
      user = await User.create({
        email,
        role: UserRole.GUEST,
        createdAt: new Date()
      });
    }

    const response = await mealmeapi.post_payment_create_v2({
      user_id: user._id.toString(),
      user_email: user.email,
      payment_method: {
        card_number: parseInt(card_number),
        expiration_month: exp_month,
        expiration_year: exp_year,
        cvc
      }
    });

    // Store payment method in our database
    const newPaymentMethod = {
      id: response.data.payment_method_id,
      last4: card_number.slice(-4),
      exp_month,
      exp_year,
      brand: response.data.card_type || 'unknown'
    };

    await User.findByIdAndUpdate(user._id, {
      $push: {
        paymentMethods: newPaymentMethod
      }
    });

    res.json({
      ...response.data,
      paymentMethod: newPaymentMethod,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    res.status(500).json({ message: 'Error creating payment method' });
  }
};

const getAdminOrders = async (req: Request, res: Response) => {
  try {
    const { 
      influencerId, 
      status, 
      startDate, 
      endDate,
      sort 
    } = req.query;

    const query: any = {};

    if (influencerId) {
      query.influencer_id = influencerId;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate as string);
      }
    }

    // Parse sort parameter
    let sortOptions = {};
    if (sort) {
      const [field, direction] = (sort as string).split(':');
      sortOptions = { [field]: direction === 'asc' ? 1 : -1 };
    } else {
      sortOptions = { createdAt: -1 };
    }

    const orders = await Order.find(query)
      .populate("restaurant")
      .populate("user")
      .populate("influencer")
      .sort(sortOptions);

    res.json(orders);
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    res.status(500).json({ message: "Error fetching orders" });
  }
};

const createAddress = async (req: Request, res: Response) => {
  try {
    mealmeapi.auth(MEALME_API_KEY);
    
    const { email, latitude, longitude, streetNum, streetName, city, state, zipcode, country } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find existing user or create new guest user
    let user = await User.findOne({ email });
    
    if (!user) {
      user = await User.create({
        email,
        role: UserRole.GUEST,
        createdAt: new Date()
      });
    }

    // Create new address object
    const newAddress = {
      latitude,
      longitude, 
      streetNum,
      streetName,
      city,
      state,
      zipcode,
      country
    };

    // Add address to user's addresses array if it doesn't exist
    const addressExists = user.addresses.some(addr => 
      addr.latitude === latitude &&
      addr.longitude === longitude &&
      addr.streetNum === streetNum &&
      addr.streetName === streetName &&
      addr.city === city &&
      addr.state === state &&
      addr.zipcode === zipcode &&
      addr.country === country
    );

    if (!addressExists) {
      user.addresses.push(newAddress);
      await user.save();
    }

    res.json({
      success: true,
      address: newAddress,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        addresses: user.addresses
      }
    });

  } catch (error) {
    console.error('Error creating address:', error);
    res.status(500).json({ message: 'Error creating address' });
  }
};

const getPaymentMethods = async (req: Request, res: Response) => {
  try {
    const { user_email } = req.query;
    
    if (user_email !== req.userEmail) {
      return res.status(403).json({ message: "Forbidden: Email mismatch" });
    }
    
    if (!user_email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user and their payment methods in our database
    const user = await User.findOne({ email: user_email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(user, 'user by id');

    // If we have payment methods stored, return them
    if (user.paymentMethods && user.paymentMethods.length > 0) {
      return res.json(user.paymentMethods);
    }

    // If no payment methods found in our db, fetch from MealMe and store them
    mealmeapi.auth(MEALME_API_KEY);
    const response = await mealmeapi.get_payment_list({
      user_id: user._id.toString(),
      user_email: user_email as string
    });
    
    console.log(response.data, 'response.data from payment');
    
    // Store payment methods in our database
    if (response.data.payment_methods?.length > 0) {
      const paymentMethods = response.data.payment_methods.map((pm: any) => ({
        id: pm.id,
        exp_month: pm.exp_month,
        exp_year: pm.exp_year,
        last4: pm.last4,
        network: pm.network
      }));

      console.log(paymentMethods, 'paymentMethods for update');

      await User.findByIdAndUpdate(user._id, {
        $set: { paymentMethods: paymentMethods }
      });
    }

    res.json(response.data.payment_methods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Error fetching payment methods' });
  }
};

const getCoordinatesFromAddress = async (req: Request, res: Response) => {
  try {
    mealmeapi.auth(MEALME_API_KEY);

    const { address } = req.body;

    const response = await mealmeapi.post_geocode_address_v2({
      address: address
    });

    console.log(response.data, 'response.data');

    res.json(response.data);
  } catch (error) {
    console.error('Error getting coordinates:', error);
    res.status(500).json({ message: 'Error getting coordinates' });
  }
};

const searchCart = async (req: Request, res: Response) => {
  try {
    mealmeapi.auth(MEALME_API_KEY);

    const { query, latitude, longitude, maximumMiles = 5, user_street_num, user_street_name, user_city, user_state, user_zipcode, user_country } = req.query;

    console.log(query, 'query');

    if (typeof query !== 'string') {
      return res.status(400).json({ message: 'Query must be a string' });
    }

    const queryObject: any = query?.split(',').reduce((acc: any, item: string) => ({
      ...acc,
      ["" + item + ""]: 1
    }), {});

    console.log(queryObject, 'queryObject');
    console.log(latitude, 'latitude');
    console.log(longitude, 'longitude');
    console.log(maximumMiles, 'maximumMiles');

    const response = await mealmeapi.get_search_cart({
      query: queryObject,
      user_latitude: Number(latitude),
      user_longitude: Number(longitude),
      user_street_num: user_street_num as string,
      user_street_name: user_street_name as string,
      user_city: user_city as string,
      user_state: user_state as string,
      user_zipcode: user_zipcode as string,
      user_country: user_country as string,
      maximum_miles: Number(maximumMiles),
      pickup: false,
      fetch_quotes: false,
      sort: 'relevance',
      use_new_db: true,
      full_carts_only: false,
      open: false,
      default_quote: false,
      autocomplete: false,
      include_utc_hours: false,
      include_final_quote: false,
      store_type: 'grocery'
    });

    console.log(response.data, 'response.data');

    res.json(response.data);
  } catch (error) {
    console.error('Error searching cart:', error);
    res.status(500).json({ message: 'Error searching cart' });
  }
};

const processStoreInventory = async (req: Request, res: Response) => {
  try {
    const { store_id, latitude, longitude, user_street_num, user_street_name, user_city, user_state, user_zipcode, user_country } = req.body;
    console.log(req.body, 'req.body from process store inventory controller');

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    // Check if store is currently being processed or was recently processed
    const storeProcessing = await StoreProcessingStatus.findOne({ store_id });
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (storeProcessing) {
      // If store is currently being processed, skip
      if (storeProcessing.is_processing) {
        return res.json({ message: 'Store inventory is currently being processed' });
      }

      // If store was processed within last 24 hours, skip
      if (storeProcessing.time_end && storeProcessing.time_end > oneDayAgo) {
        return res.json({ message: 'Store inventory was recently processed', last_processed: storeProcessing.time_end });
      }
    }

    // Make request to external inventory processing service
    try {
      const response = await fetch('https://lvfkh07zhh.execute-api.us-east-1.amazonaws.com/grocery/process-inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store_id,
          latitude,
          longitude,
          user_street_num,
          user_street_name, 
          user_city,
          user_state,
          user_zipcode,
          user_country
        })
      });

      console.log(await response.json(), 'response from process store inventory controller');
      // Only add to queue if request succeeded
      if (response.ok) {
        // Update or create processing status
        await StoreProcessingStatus.findOneAndUpdate(
          { store_id },
          {
            store_id,
            is_processing: true,
            time_start: new Date(),
            time_end: null
          },
          { upsert: true }
        );

        // await inventoryQueue.add({
        //   store_id,
        //   latitude,
        //   longitude,
        //   user_street_num,
        //   user_street_name,
        //   user_city,
        //   user_state,
        //   user_zipcode,
        //   user_country
        // });
      }

      res.json({ message: 'Store inventory processing started' });
    } catch (error) {
      console.error('Error calling external inventory processor:', error);
      // Continue execution even if external service fails
    }

    // console.log("Processing inventory job for store: ", store_id);
    // mealmeapi.auth(process.env.MEALME_API_KEY as string);

    // const response = await mealmeapi.get_inventory_details_v3({
    //   store_id: store_id as string,
    //   user_latitude: Number(latitude),
    //   user_longitude: Number(longitude),
    //   pickup: false,
    //   include_quote: true,
    //   use_new_db: true,
    //   user_street_num: user_street_num as string,
    //   user_street_name: user_street_name as string,
    //   user_city: user_city as string,
    //   user_state: user_state as string,
    //   user_zipcode: user_zipcode as string,
    //   user_country: user_country as string,
    //   quote_preference: 'default'
    // });

    // console.log(response, 'response.data from grocery controller');

  } catch (error) {
    console.error('Error queuing store inventory processing:', error);
    res.status(500).json({ message: 'Error queuing store inventory processing' });
  }
};

const getAddresses = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (email !== req.userEmail) {
      return res.status(403).json({ message: "Forbidden: Email mismatch" });
    }

    const user = await User.findOne({ email });

    res.json(user?.addresses);
  } catch (error) {
    console.error('Error getting addresses:', error);
    res.status(500).json({ message: 'Error getting addresses' });
  }
};

const deletePaymentMethod = async (req: Request, res: Response) => {
  try {
    mealmeapi.auth(MEALME_API_KEY);

    const { payment_method_id, user_email } = req.body;

    if (!payment_method_id || !user_email) {
      return res.status(400).json({ message: 'Payment method ID and email are required' });
    }

    const user = await User.findOne({ email: user_email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete from MealMe
    const response = await mealmeapi.post_payment_delete({
      user_id: user._id.toString(),
      user_email: user.email,
      payment_method_id
    });

    // Remove payment method from user's record
    await User.findByIdAndUpdate(user._id, {
      $pull: {
        paymentMethods: { id: payment_method_id }
      }
    });

    res.json({
      ...response.data,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ message: 'Error deleting payment method' });
  }
};

const deleteAddress = async (req: Request, res: Response) => {
  try {
    const { street_num, street_name, user_email } = req.body;

    if (!street_num || !street_name || !user_email) {
      return res.status(400).json({ message: 'Street number, street name, and email are required' });
    }

    const user = await User.findOne({ email: user_email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const initialAddressCount = user.addresses.length;
    user.addresses = user.addresses.filter(address => 
      address.streetNum !== street_num || address.streetName !== street_name
    );

    if (user.addresses.length === initialAddressCount) {
      return res.status(404).json({ message: 'Address not found' });
    }

    await user.save();

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ message: 'Error deleting address' });
  }
};

export { searchGroceryStores, searchProducts, getGeolocation, createGroceryOrder, findStoresForShoppingList, createShoppingListOrder,
  getStoreInventory, finalizeOrder, createPaymentMethod, getPaymentMethods, getCoordinatesFromAddress, searchCart, processStoreInventory,
  getFitbiteInventory, createAddress, getAddresses, deletePaymentMethod, deleteAddress, getAdminOrders };