import mongoose from "mongoose";

export enum UserRole {
  GUEST = 'guest',
  MEMBER = 'member',
  CREATOR = 'creator',
  ADMIN = 'admin',
  USER = 'user'
}

interface Address {
  latitude: number;
  longitude: number;
  streetNum: string;
  streetName: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
}

interface User {
  _id: string;
  auth0Id: string;
  email: string;
  name?: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  addresses: Address[];
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  streetNum: String,
  streetName: String,
  city: String,
  state: String,
  zipcode: String,
  country: String,
});

const userSchema = new mongoose.Schema({
  auth0Id: {
    type: String,
  },
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  addressLine1: {
    type: String,
  },
  city: {
    type: String,
  },
  country: {
    type: String,
  },
  addresses: [addressSchema],
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
  },
}, {
  timestamps: true
});

const User = mongoose.model<User>("User", userSchema);
export default User;