import { Request, Response } from 'express';
import mealmeapi from '@api/mealmeapi';
import { ShoppingListItemType, ShoppingListType, ShoppingList, ShoppingListItem } from '../models/grocery';
import { Order } from '../models/order';

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
      budget,
      maximumMiles = 3,
    } = req.query;

    const response = await mealmeapi.get_search_store_v3({
      query: query as string,
      latitude: Number(latitude),
      longitude: Number(longitude), 
      store_type: 'grocery',
      budget: Number(budget),
      maximum_miles: Number(maximumMiles),
      search_focus: 'store',
      sort: 'relevance',
      pickup: false,
      fetch_quotes: false,
      open: false,
      default_quote: false,
      autocomplete: false,
      include_utc_hours: false,
      projections: '_id,name,address,type,is_open',
      use_new_db: true
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error searching grocery stores:', error);
    res.status(500).json({ message: 'Error searching grocery stores' });
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
      maximumMiles = 1.5,
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
      use_new_db: true
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

const createGroceryOrder = async (req: Request, res: Response) => {
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
    } = req.query;

    const response = await mealmeapi.get_inventory_details_v3({
      store_id: store_id as string,
      subcategory_id: subcategory_id as string || undefined,
      user_latitude: Number(latitude),
      user_longitude: Number(longitude),
      pickup: false,
      fetch_quotes: false,
      user_street_num: "",
      user_street_name: "",
      user_city: "",
      user_state: "",
      user_zipcode: "",
      user_country: "US"
    });

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
      }))
    };

    res.json(inventory);
  } catch (error) {
    console.error('Error fetching store inventory:', error);
    res.status(500).json({ message: 'Error fetching store inventory' });
  }
};

const createOrder = async (req: Request, res: Response) => {
  try {
    const { store_id, items, delivery_details, place_order, final_quote } = req.body;
    
    mealmeapi.auth(MEALME_API_KEY);
    
    const orderResponse = await mealmeapi.post_order_v3({
      store_id,
      items,
      delivery_details,
      place_order,
      final_quote,
      pickup: false,
      user_email: "test@example.com", // TODO: Get from user profile
      user_id: "test123", // TODO: Get from user profile 
      user_name: "Test User", // TODO: Get from user profile
      user_phone: 1234567890 // TODO: Get from user profile
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
      delivery_fee: orderResponse.data.delivery_fee
    });

    await order.save();

    res.json(orderResponse.data);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order' });
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

const createPaymentMethod = async (req: Request & { userId: string, user: { email: string } }, res: Response) => {
  try {
    mealmeapi.auth(MEALME_API_KEY);
    
    const { card_number, exp_month, exp_year, cvc } = req.body;
    
    const response = await mealmeapi.post_payment_create_v2({
      user_id: req.userId,
      user_email: req.user.email, // Get email from user object
      card_number,
      exp_month,
      exp_year,
      cvc
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error creating payment method:', error);
    res.status(500).json({ message: 'Error creating payment method' });
  }
};

const getPaymentMethods = async (req: Request & { userId: string, user: { email: string } }, res: Response) => {
  try {
    mealmeapi.auth(MEALME_API_KEY);
    
    const response = await mealmeapi.get_payment_list({
      user_id: req.userId,
      user_email: req.user.email // Get email from user object
    });

    res.json(response.data.payment_methods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Error fetching payment methods' });
  }
};

export { searchGroceryStores, searchProducts, getGeolocation, createGroceryOrder, findStoresForShoppingList, createShoppingListOrder, getStoreInventory, createOrder, finalizeOrder, createPaymentMethod, getPaymentMethods };