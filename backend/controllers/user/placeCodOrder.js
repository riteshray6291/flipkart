import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import orderModel from "../../models/orderModel.js";
import productModel from "../../models/productModel.js";

const placeCodOrder = asyncHandler(async (req, res) => {
  const { orderItems } = req.body;
  const shippingInfo = req.user.shippingInfo;

  if (
    !Array.isArray(orderItems) ||
    orderItems.length === 0 ||
    orderItems.length > 50
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Add between 1 and 50 products to place an order.",
      });
  }
  if (
    !shippingInfo?.address ||
    !shippingInfo?.city ||
    !shippingInfo?.state ||
    !shippingInfo?.country ||
    !shippingInfo?.pincode ||
    !shippingInfo?.phoneNo
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Save complete shipping details before placing the order.",
      });
  }

  const quantities = new Map();
  for (const item of orderItems) {
    const productId = String(item?.productId || "");
    const quantity = Number(item?.quantity);
    if (
      !mongoose.isObjectIdOrHexString(productId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "The order contains an invalid product or quantity.",
        });
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  const productIds = [...quantities.keys()];
  const products = await productModel.find({ _id: { $in: productIds } });
  const productsById = new Map(
    products.map((product) => [String(product._id), product]),
  );
  if (productsById.size !== productIds.length) {
    return res
      .status(404)
      .json({
        success: false,
        message: "One or more products are no longer available.",
      });
  }

  const stockAdjustments = [];
  let createdOrder;
  try {
    const orderProducts = [];
    let amount = 0;

    for (const [productId, quantity] of quantities) {
      const product = productsById.get(productId);
      const updated = await productModel.findOneAndUpdate(
        { _id: product._id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true },
      );
      if (!updated) {
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

    createdOrder = await new orderModel({
      paymentId: `cod_${new mongoose.Types.ObjectId()}`,
      paymentMethod: "cod",
      paymentStatus: "pending",
      products: orderProducts,
      buyer: req.user._id,
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

    req.user.cart = [];
    req.user.pendingPaymentSession = undefined;
    await req.user.save();

    return res.status(201).json({
      success: true,
      orderId: createdOrder._id,
      paymentMethod: "cod",
      paymentStatus: "pending",
    });
  } catch (error) {
    if (createdOrder) await orderModel.deleteOne({ _id: createdOrder._id });
    await Promise.all(
      stockAdjustments.map(({ productId, quantity }) =>
        productModel.updateOne(
          { _id: productId },
          { $inc: { stock: quantity } },
        ),
      ),
    );
    if (error.status) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }
    console.error("Unable to place Cash on Delivery order:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Unable to place the order. Please try again.",
      });
  }
});

export default placeCodOrder;
