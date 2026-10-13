import stripe from "stripe";
import mongoose from "mongoose";
import productModel from "../../models/productModel.js";
import dotenv from "dotenv";
dotenv.config();

const isFakePaymentEnabled = () =>
  process.env.PAYMENT_MODE === "fake" &&
  ["development", "test"].includes(process.env.NODE_ENV);

const createSession = async (req, res) => {
  try {
    const {
      products,
      frontendURL,
      customerEmail,
      customerPhone,
      customerName,
    } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).send({
        success: false,
        message: "At least one MongoDB product is required for checkout.",
      });
    }

    const productIds = products.map((item) => String(item?.productId || ""));
    if (
      productIds.some(
        (productId) => !mongoose.isObjectIdOrHexString(productId),
      ) ||
      products.some(
        (item) =>
          !Number.isInteger(Number(item?.quantity)) ||
          Number(item.quantity) < 1,
      )
    ) {
      return res.status(400).send({
        success: false,
        message: "Checkout requires valid MongoDB product IDs and quantities.",
      });
    }

    const existingProducts = await productModel.find({
      _id: { $in: productIds },
    });
    if (
      new Set(existingProducts.map((product) => String(product._id))).size !==
      new Set(productIds).size
    ) {
      return res.status(404).send({
        success: false,
        message: "One or more checkout products are unavailable.",
      });
    }

    if (isFakePaymentEnabled()) {
      const sessionId = `fake_${new mongoose.Types.ObjectId()}`;
      req.user.pendingPaymentSession = sessionId;
      await req.user.save();
      return res.send({
        paymentMode: "fake",
        session: { id: sessionId },
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).send({
        success: false,
        message:
          "Stripe is not configured. Set STRIPE_SECRET_KEY or enable fake payments for local development.",
      });
    }
    const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

    // console.log(frontendURL);
    const successPath = "/shipping/confirm";
    const cancelPath = "/shipping/failed";

    const successURL = frontendURL + successPath;
    const cancelURL = frontendURL + cancelPath;
    // console.log(successURL, cancelURL);
    const lineItems = products?.map((item) => ({
      price_data: {
        currency: "inr",
        //price goes in decimal so we have to multiply by 100
        unit_amount: item.discountPrice * 100,
        product_data: {
          name: item?.name,
        },
      },
      quantity: item.quantity,
    }));
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ["card"],
      currency: "inr",
      line_items: lineItems,
      mode: "payment",
      success_url: successURL,
      cancel_url: cancelURL,
      customer_email: customerEmail,
      shipping_address_collection: {
        allowed_countries: ["IN"], // Limit address collection to specific countries if needed
      },
      phone_number_collection: {
        enabled: true,
      },
    });

    req.user.pendingPaymentSession = session.id;
    await req.user.save();

    res.send({ paymentMode: "stripe", session });
  } catch (error) {
    console.log("Error in creating stripe session id: " + error);
    res.status(500).send({
      success: false,
      message: "Error in Payment Gateway",
      error,
    });
  }
};
export default createSession;
