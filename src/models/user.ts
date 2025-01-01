import mongoose from "mongoose";

export enum UserRole {
  GUEST = 'guest',
  MEMBER = 'member',
  CREATOR = 'creator',
  ADMIN = 'admin',
  USER = 'user'
}

interface User {
  _id: string;
  auth0Id: string;
  email: string;
  name?: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

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