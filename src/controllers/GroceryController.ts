import { Request, Response } from 'express';
import mealmeapi from '@api/mealmeapi';
import { ShoppingListItemType, ShoppingListType, ShoppingList, ShoppingListItem } from '../models/grocery';
import { Order } from '../models/order';
import User, { UserRole } from '../models/user';
import { InventoryItem } from '../models/grocery';
import inventoryQueue from '../queues/inventoryQueue';
import OpenAI from "openai"

const MEALME_API_KEY = process.env.MEALME_API_KEY as string;

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
    mealmeapi.auth(MEALME_API_KEY);

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

    const response = await mealmeapi.get_search_store_v3({
      query: query as string,
      latitude: Number(latitude),
      longitude: Number(longitude),
      store_type: 'grocery', 
      budget: Number(budget),
      maximum_miles: 10,
      search_focus: search_focus as string,
      sort: sort as string,
      pickup: pickup === 'true',
      fetch_quotes: false,
      open: false, //open === 'true',
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

    // Extract store info to analyze with GPT
    const storeList = response.data.stores.map((store: any) => ({
      id: store._id,
      name: store.name,
      type: store.type,
      address: store.address
    }));

    // Call OpenAI API to analyze stores
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are helping identify true grocery stores from a list of stores.
          Return only an array of store IDs as json that you determine to be actual grocery stores, excluding convenience stores, gas stations, etc.
          Don't filter out the following stores: target, aldi`
        },
        {
          role: "user", 
          content: JSON.stringify(storeList)
        }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const groceryStoreIds = JSON.parse(gptResponse.choices[0].message.content!)?.store_ids;

    console.log(groceryStoreIds, 'groceryStoreIds');
    console.log(response.data, 'response.data');
    console.log(response.data.stores, 'response.data.stores');

    // Filter original response to only include identified grocery stores
    const filteredResponse = {
      ...response.data,
      stores: response.data.stores.filter((store: any) => 
        groceryStoreIds.includes(store._id) && 
        !store.name.toLowerCase().includes('liquor')
      )
    };

    res.json(filteredResponse);

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

const deprGetFitbiteInventory = async (req: Request, res: Response) => {
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
    const { store_id, items, delivery_details, place_order, final_quote, payment_details, influencer_id, meal_plan_name, plan_start_day } = req.body;
    
    mealmeapi.auth(MEALME_API_KEY);

    console.log(delivery_details, 'delivery_details');
    
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
      user_id: "test123", // TODO: Get from user profile 
      user_name: "Test User", // TODO: Get from user profile
      user_phone: 5622043228, // TODO: Get from user profile
      charge_user: true,
      include_final_quote: true,
      disable_sms: false,
      email_receipt_specifications: {
        prices_marked: false,
        added_fee: {added_fee_flat: 200, added_fee_percent: 0},
        unify_service_fee: true,
        disable_email: false
      },
      favorited: false,
      enable_substitution: true,
      autofill_selected_options: true,
      payment_method_id: payment_details.payment_method_id
    });

    // Store order in our database
    const order = new Order({
      user: req.userId,
      store_id,
      items,
      delivery_details,
      mealme_order_id: orderResponse.data.order_id,
      status: 'pending',
      total: orderResponse.data.total,
      subtotal: orderResponse.data.subtotal,
      tax: orderResponse.data.tax,
      delivery_fee: orderResponse.data.delivery_fee,
      influencer_id, // Add influencer reference
      meal_plan_name, // Add meal plan name for reference
      plan_start_day
    });

    await order.save();

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

    console.log(email, 'email');
    console.log(card_number, 'card_number');
    console.log(exp_month, 'exp_month');
    console.log(exp_year, 'exp_year');
    console.log(cvc, 'cvc');
    
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

    res.json({
      ...response.data,
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
    mealmeapi.auth(MEALME_API_KEY);

    const { user_email } = req.query;

    console.log(user_email, 'user_email');
    
    if (!user_email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user in our database
    const user = await User.findOne({ email: user_email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const response = await mealmeapi.get_payment_list({
      user_id: user._id.toString(),
      user_email: user_email as string
    });

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

    if (!store_id) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    console.log("Processing inventory job for store: ", store_id);
    mealmeapi.auth(process.env.MEALME_API_KEY as string);

    const response = await mealmeapi.get_inventory_details_v3({
      store_id: store_id as string,
      user_latitude: Number(latitude),
      user_longitude: Number(longitude),
      pickup: false,
      include_quote: true,
      use_new_db: true,
      user_street_num: user_street_num as string,
      user_street_name: user_street_name as string,
      user_city: user_city as string,
      user_state: user_state as string,
      user_zipcode: user_zipcode as string,
      user_country: user_country as string,
      quote_preference: 'default'
    });

    console.log(response, 'response.data from grocery controller');

    // Only add to queue if MealMe call succeeded
    if (response?.data) {
      await inventoryQueue.add({
        store_id,
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

    res.json(response.data);
  } catch (error) {
    console.error('Error queuing store inventory processing:', error);
    res.status(500).json({ message: 'Error queuing store inventory processing' });
  }
};

const getAddresses = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    const user = await User.findOne({ email });

    res.json(user?.addresses);
  } catch (error) {
    console.error('Error getting addresses:', error);
    res.status(500).json({ message: 'Error getting addresses' });
  }
};

export { searchGroceryStores, searchProducts, getGeolocation, createGroceryOrder, findStoresForShoppingList, createShoppingListOrder,
  getStoreInventory, finalizeOrder, createPaymentMethod, getPaymentMethods, getCoordinatesFromAddress, searchCart, processStoreInventory,
  deprGetFitbiteInventory, createAddress, getAddresses };