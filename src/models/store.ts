import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  address: {
    street_num: String,
    street_name: String,
    street_addr: String,
    street_addr_2: String,
    city: String,
    state: String,
    zip_code: String,
    country: String,
    latitude: Number,
    longitude: Number
  },
  is_open: {
    type: Boolean,
    required: true
  },
  miles: {
    type: Number,
    required: true
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
storeSchema.index({ 'address.latitude': 1, 'address.longitude': 1 });

const Store = mongoose.model('Store', storeSchema);

export default Store;
