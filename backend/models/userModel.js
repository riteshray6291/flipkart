import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    role: {
      type: Number,
      default: 0,
    },
    pan: {
      number: {
        type: String,
      },
      name: {
        type: String,
      },
    },
    wishlist: [{ type: mongoose.Schema.ObjectId, ref: "Product" }],
    cart: { type: [mongoose.Schema.Types.Mixed], default: [] },
    saveLater: { type: [mongoose.Schema.Types.Mixed], default: [] },
    shippingInfo: {
      address: String,
      city: String,
      country: String,
      state: String,
      landmark: String,
      pincode: String,
      phoneNo: String,
    },
    pendingPaymentSession: String,
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
