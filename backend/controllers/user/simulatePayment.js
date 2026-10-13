import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import orderModel from "../../models/orderModel.js";
import productModel from "../../models/productModel.js";

const PAYMENT_METHODS = new Set(["upi", "card", "cod", "netbanking"]);
const getPaymentResult = (order) =>
  ["PAID", "PENDING", "paid", "pending"].includes(order.paymentStatus)
    ? "success"
    : "failure";

const getShippingInfo = (shippingInfo) => {
  const requiredFields = [
    "address",
    "city",
    "state",
    "country",
    "pincode",
    "phoneNo",
  ];
  if (
    !shippingInfo ||
    requiredFields.some((field) => !String(shippingInfo[field] || "").trim())
  ) {
    const error = new Error(
      "Complete your delivery address before placing the order.",
    );
    error.status = 400;
    throw error;
  }
  if (
    !/^\d{6}$/.test(String(shippingInfo.pincode)) ||
    !/^\d{10}$/.test(String(shippingInfo.phoneNo))
  ) {
    const error = new Error(
      "Enter a valid 6-digit pincode and 10-digit phone number.",
    );
    error.status = 400;
    throw error;
  }

  return {
    address: String(shippingInfo.address).trim(),
    city: String(shippingInfo.city).trim(),
    state: String(shippingInfo.state).trim(),
    country: String(shippingInfo.country).trim(),
    pincode: Number(shippingInfo.pincode),
    phoneNo: Number(shippingInfo.phoneNo),
    landmark: String(shippingInfo.landmark || "").trim(),
  };
};

const reserveStock = async (products) => {
  const adjustments = [];
  try {
    for (const item of products) {
      const updated = await productModel.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true },
      );
      if (!updated) {
        const error = new Error(`${item.name} does not have enough stock.`);
        error.status = 409;
        throw error;
      }
      adjustments.push({ productId: item.productId, quantity: item.quantity });
    }
    return adjustments;
  } catch (error) {
    await Promise.all(
      adjustments.map(({ productId, quantity }) =>
        productModel.updateOne(
          { _id: productId },
          { $inc: { stock: quantity } },
        ),
      ),
    );
    throw error;
  }
};

const restoreStock = (adjustments) =>
  Promise.all(
    adjustments.map(({ productId, quantity }) =>
      productModel.updateOne({ _id: productId }, { $inc: { stock: quantity } }),
    ),
  );

const clearPurchasedItems = (user, products) => {
  const remaining = new Map(
    products.map((item) => [String(item.productId), item.quantity]),
  );
  user.cart = (user.cart || []).flatMap((item) => {
    const id = String(item.productId);
    const toRemove = remaining.get(id) || 0;
    if (!toRemove) return [item];
    const quantity = Number(item.quantity) - toRemove;
    remaining.set(id, Math.max(0, toRemove - Number(item.quantity)));
    return quantity > 0 ? [{ ...(item.toObject?.() ?? item), quantity }] : [];
  });
};

const createOrderItems = async (cartItems) => {
  if (
    !Array.isArray(cartItems) ||
    cartItems.length === 0 ||
    cartItems.length > 50
  ) {
    const error = new Error("Your cart is empty or contains too many items.");
    error.status = 400;
    throw error;
  }

  const quantities = new Map();
  for (const item of cartItems) {
    const productId = String(item?.productId || "");
    const quantity = Number(item?.quantity);
    if (
      !mongoose.isObjectIdOrHexString(productId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      const error = new Error(
        "Your cart contains an invalid product or quantity.",
      );
      error.status = 400;
      throw error;
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  const ids = [...quantities.keys()];
  const products = await productModel.find({ _id: { $in: ids } });
  const productsById = new Map(
    products.map((product) => [String(product._id), product]),
  );
  if (productsById.size !== ids.length) {
    const error = new Error("One or more products are no longer available.");
    error.status = 404;
    throw error;
  }

  const orderItems = [];
  for (const [productId, quantity] of quantities) {
    const product = productsById.get(productId);
    if (quantity > 99 || product.stock < quantity) {
      const error = new Error(`${product.name} does not have enough stock.`);
      error.status = 409;
      throw error;
    }
    orderItems.push({
      name: product.name,
      image: product.images?.[0]?.url || "",
      brandName: product.brand?.name || "",
      price: Number(product.price),
      discountPrice: Number(product.discountPrice),
      quantity,
      productId: product._id,
      seller: product.seller,
    });
  }
  return orderItems;
};

const getTotals = (products) => {
  const subtotal = products.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const amount = products.reduce(
    (sum, item) => sum + item.discountPrice * item.quantity,
    0,
  );
  return { subtotal, discount: subtotal - amount, deliveryCharge: 0, amount };
};

const simulatePayment = asyncHandler(async (req, res) => {
  const isCod = req.body.paymentMethod === "cod";
  const demoPaymentsEnabled =
    process.env.PAYMENT_MODE === "fake" &&
    ["development", "test"].includes(process.env.NODE_ENV);
  if (!isCod && !demoPaymentsEnabled) {
    return res
      .status(404)
      .json({ success: false, message: "Demo payments are unavailable." });
  }
  const { paymentMethod, outcome, idempotencyKey, orderId } = req.body;
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    return res
      .status(400)
      .json({ success: false, message: "Choose a valid demo payment method." });
  }
  if (
    !orderId &&
    !/^[a-zA-Z0-9_-]{12,100}$/.test(String(idempotencyKey || ""))
  ) {
    return res
      .status(400)
      .json({ success: false, message: "A valid checkout key is required." });
  }
  if (paymentMethod !== "cod" && !["success", "failure"].includes(outcome)) {
    return res
      .status(400)
      .json({ success: false, message: "Choose a simulated payment result." });
  }

  if (orderId) {
    if (!mongoose.isObjectIdOrHexString(orderId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID." });
    }
    const order = await orderModel.findOne({
      _id: orderId,
      buyer: req.user._id,
    });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    if (order.paymentStatus === "PAID" || order.paymentStatus === "paid") {
      clearPurchasedItems(req.user, order.products);
      await req.user.save();
      return res
        .status(200)
        .json({
          success: true,
          paymentResult: "success",
          order,
          cartItems: req.user.cart,
        });
    }
    if (order.paymentStatus !== "FAILED" && order.paymentStatus !== "failed") {
      return res
        .status(400)
        .json({
          success: false,
          message: "This order is not eligible for payment retry.",
        });
    }
    if (order.paymentMethod !== paymentMethod) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Retry using the payment method selected for this order.",
        });
    }
    if (outcome === "failure") {
      return res
        .status(200)
        .json({ success: true, paymentResult: "failure", order });
    }

    const lockedOrder = await orderModel.findOneAndUpdate(
      { _id: order._id, paymentStatus: { $in: ["FAILED", "failed"] } },
      { $set: { paymentStatus: "PROCESSING" } },
      { new: true },
    );
    if (!lockedOrder) {
      const latestOrder = await orderModel.findById(order._id);
      if (latestOrder?.paymentStatus === "PAID") {
        return res
          .status(200)
          .json({
            success: true,
            paymentResult: "success",
            order: latestOrder,
          });
      }
      return res
        .status(409)
        .json({
          success: false,
          message: "This payment is already being processed.",
        });
    }

    let adjustments = [];
    let paymentSaved = false;
    try {
      adjustments = await reserveStock(lockedOrder.products);
      lockedOrder.paymentStatus = "PAID";
      lockedOrder.orderStatus = "CONFIRMED";
      lockedOrder.paymentId = `demo_${new mongoose.Types.ObjectId()}`;
      await lockedOrder.save();
      paymentSaved = true;
      clearPurchasedItems(req.user, lockedOrder.products);
      await req.user.save();
      return res
        .status(200)
        .json({
          success: true,
          paymentResult: "success",
          order: lockedOrder,
          cartItems: req.user.cart,
        });
    } catch (error) {
      if (!paymentSaved) {
        await restoreStock(adjustments);
        await orderModel.updateOne(
          { _id: lockedOrder._id, paymentStatus: "PROCESSING" },
          { $set: { paymentStatus: "FAILED" } },
        );
      }
      throw error;
    }
  }

  const previousOrder = await orderModel.findOne({
    idempotencyKey,
    buyer: req.user._id,
  });
  if (previousOrder) {
    return res.status(200).json({
      success: true,
      paymentResult: getPaymentResult(previousOrder),
      order: previousOrder,
      cartItems: req.user.cart,
    });
  }

  const shippingInfo = getShippingInfo(req.user.shippingInfo);
  const products = await createOrderItems(req.user.cart);
  const totals = getTotals(products);
  const isCashOnDelivery = paymentMethod === "cod";
  const isSuccessful = isCashOnDelivery || outcome === "success";
  const orderData = {
    paymentId: `demo_${new mongoose.Types.ObjectId()}`,
    idempotencyKey,
    paymentMethod,
    paymentStatus: isCashOnDelivery
      ? "PENDING"
      : isSuccessful
        ? "PAID"
        : "FAILED",
    products,
    buyer: req.user._id,
    shippingInfo,
    ...totals,
    orderStatus: isSuccessful ? "CONFIRMED" : "PAYMENT_FAILED",
  };

  if (!isSuccessful) {
    try {
      const order = await new orderModel(orderData).save();
      return res
        .status(200)
        .json({ success: true, paymentResult: "failure", order });
    } catch (error) {
      if (error.code === 11000) {
        const existingOrder = await orderModel.findOne({
          idempotencyKey,
          buyer: req.user._id,
        });
        if (existingOrder)
          return res
            .status(200)
            .json({
              success: true,
              paymentResult: getPaymentResult(existingOrder),
              order: existingOrder,
            });
      }
      throw error;
    }
  }

  const adjustments = await reserveStock(products);
  let order;
  try {
    order = await new orderModel(orderData).save();
    clearPurchasedItems(req.user, products);
    req.user.pendingPaymentSession = undefined;
    await req.user.save();
  } catch (error) {
    if (order) await orderModel.deleteOne({ _id: order._id });
    await restoreStock(adjustments);
    if (error.code === 11000) {
      const existingOrder = await orderModel.findOne({
        idempotencyKey,
        buyer: req.user._id,
      });
      if (existingOrder) {
        return res
          .status(200)
          .json({
            success: true,
            paymentResult: getPaymentResult(existingOrder),
            order: existingOrder,
          });
      }
    }
    throw error;
  }

  return res
    .status(201)
    .json({
      success: true,
      paymentResult: "success",
      order,
      cartItems: req.user.cart,
    });
});

export default simulatePayment;
