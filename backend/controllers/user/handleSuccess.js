import stripe from "stripe";
import dotenv from "dotenv";
import orderModel from "../../models/orderModel.js";
import mongoose from "mongoose";
import productModel from "../../models/productModel.js";

dotenv.config();

const isFakePaymentEnabled = () =>
  process.env.PAYMENT_MODE === "fake" &&
  ["development", "test"].includes(process.env.NODE_ENV);

const handleFakePayment = async ({
  sessionId,
  orderItems,
  shippingInfo,
  buyerId,
}) => {
  if (!String(sessionId).startsWith("fake_")) {
    const error = new Error("Invalid fake payment session.");
    error.status = 400;
    throw error;
  }

  const priorOrder = await orderModel.findOne({ paymentId: sessionId });
  if (priorOrder) return;

  const requiredAddressFields = [
    "address",
    "city",
    "state",
    "country",
    "pincode",
    "phoneNo",
  ];
  if (
    !shippingInfo ||
    requiredAddressFields.some((field) => !shippingInfo[field])
  ) {
    const error = new Error(
      "Complete shipping details before confirming the fake payment.",
    );
    error.status = 400;
    throw error;
  }

  const productIds = orderItems.map((item) => String(item.productId));
  const products = await productModel.find({ _id: { $in: productIds } });
  const productsById = new Map(
    products.map((product) => [String(product._id), product]),
  );
  if (productsById.size !== new Set(productIds).size) {
    const error = new Error("One or more checkout products are unavailable.");
    error.status = 404;
    throw error;
  }

  const orderProducts = [];
  const stockAdjustments = [];
  let amount = 0;
  try {
    for (const item of orderItems) {
      const product = productsById.get(String(item.productId));
      const quantity = Number(item.quantity);
      const updatedProduct = await productModel.findOneAndUpdate(
        { _id: product._id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true },
      );
      if (!updatedProduct) {
        const error = new Error(`${product.name} does not have enough stock.`);
        error.status = 409;
        throw error;
      }
      stockAdjustments.push({ productId: product._id, quantity });

      const unitPrice = Number(product.discountPrice);
      amount += unitPrice * quantity;
      orderProducts.push({
        name: product.name,
        image: product.images?.[0]?.url || "",
        brandName: product.brand?.name || "",
        price: product.price,
        discountPrice: unitPrice,
        quantity,
        productId: product._id,
        seller: product.seller,
      });
    }

    await new orderModel({
      paymentId: sessionId,
      products: orderProducts,
      buyer: buyerId,
      shippingInfo: {
        address: shippingInfo.address,
        city: shippingInfo.city,
        state: shippingInfo.state,
        country: shippingInfo.country,
        pincode: Number(shippingInfo.pincode),
        phoneNo: Number(shippingInfo.phoneNo),
        landmark: shippingInfo.landmark || "No Landmark",
      },
      amount,
    }).save();
  } catch (error) {
    await Promise.all(
      stockAdjustments.map(({ productId, quantity }) =>
        productModel.updateOne(
          { _id: productId },
          { $inc: { stock: quantity } },
        ),
      ),
    );
    throw error;
  }
};

const handleSuccess = async (req, res) => {
  try {
    const { sessionId, orderItems, shippingInfo } = req.body;
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res
        .status(400)
        .send({ success: false, message: "No order items received." });
    }
    if (!sessionId) {
      return res
        .status(400)
        .send({ success: false, message: "No payment session ID received." });
    }
    if (req.user.pendingPaymentSession !== sessionId) {
      return res
        .status(400)
        .send({
          success: false,
          message: "Payment session does not match this account.",
        });
    }

    const productIds = orderItems.map((item) => String(item?.productId || ""));
    if (
      productIds.some(
        (productId) => !mongoose.isObjectIdOrHexString(productId),
      ) ||
      orderItems.some(
        (item) =>
          !Number.isInteger(Number(item?.quantity)) ||
          Number(item.quantity) < 1,
      )
    ) {
      return res
        .status(400)
        .send({
          success: false,
          message: "Checkout requires valid product IDs and quantities.",
        });
    }

    if (isFakePaymentEnabled()) {
      await handleFakePayment({
        sessionId,
        orderItems,
        shippingInfo,
        buyerId: req.user._id,
      });
      req.user.pendingPaymentSession = undefined;
      req.user.cart = [];
      await req.user.save();
      return res.status(200).send({ success: true, paymentMode: "fake" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res
        .status(503)
        .send({ success: false, message: "Stripe is not configured." });
    }
    const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripeInstance.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return res
        .status(400)
        .send({ success: false, message: "Payment has not been completed." });
    }

    const existingProducts = await productModel
      .find({ _id: { $in: productIds } })
      .select("_id");
    if (
      new Set(existingProducts.map((product) => String(product._id))).size !==
      new Set(productIds).size
    ) {
      return res
        .status(404)
        .send({
          success: false,
          message: "One or more order products are unavailable.",
        });
    }

    const orderObject = orderItems.map((product) => ({
      name: product.name,
      image: product.image,
      brandName: product.brandName,
      price: product.price,
      discountPrice: product.discountPrice,
      quantity: product.quantity,
      productId: new mongoose.Types.ObjectId(product.productId),
      seller: new mongoose.Types.ObjectId(product.seller),
    }));
    const shippingObject = {
      address: session?.customer_details?.address?.line1,
      city: session?.customer_details?.address?.city,
      state: session?.customer_details?.address?.state,
      country: session?.customer_details?.address?.country,
      pincode: session?.customer_details?.address?.postal_code,
      phoneNo: session?.customer_details?.phone || "Not Provided",
      landmark: session?.customer_details?.address?.line2 || "No Landmark",
    };
    await new orderModel({
      paymentId: session?.payment_intent,
      products: orderObject,
      buyer: req.user._id,
      shippingInfo: shippingObject,
      amount: session.amount_total / 100,
    }).save();

    req.user.pendingPaymentSession = undefined;
    req.user.cart = [];
    await req.user.save();

    for (const item of orderItems) {
      const product = await productModel.findById(item.productId);
      if (product) {
        product.stock -= item.quantity;
        await product.save();
      }
    }
    return res.status(200).send({ success: true });
  } catch (error) {
    console.error("Error in handling payment success:", error);
    return res.status(error.status || 500).send({
      success: false,
      message: error.status
        ? error.message
        : "Error in handling payment success",
    });
  }
};

export default handleSuccess;
