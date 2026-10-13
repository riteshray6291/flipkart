import orderModel from "../../models/orderModel.js";
import mongoose from "mongoose";

const getOrders = async (req, res) => {
  try {
    const orderId = req.params.id || req.query.orderId;
    if (!mongoose.isObjectIdOrHexString(orderId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID." });
    }
    const filter = { _id: orderId };
    if (req.user.role !== 1) filter.buyer = req.user._id;
    const orderDetails = await orderModel
      .findOne(filter)
      .populate({ path: "buyer", select: "name email" })
      .populate({ path: "products.seller", select: "name" });
    if (!orderDetails) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    return res.status(200).send({
      success: true,
      orderDetails: orderDetails,
    });
  } catch (error) {
    console.error("Error in getting Order Details:", error);
    return res
      .status(500)
      .send({ success: false, message: "Error in getting order details." });
  }
};

export default getOrders;
