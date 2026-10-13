import orderModel from "../../models/orderModel.js";
import userModel from "../../models/userModel.js";

const updateOrder = async (req, res) => {
  try {
    const { status, orderId } = req.body;
    const allowedStatuses = new Set([
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ]);
    if (!orderId || !allowedStatuses.has(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID or status." });
    }
    const update = { orderStatus: status };
    if (status === "Delivered") update.deliveredAt = new Date();
    if (status === "Shipped") update.shippedAt = new Date();
    const updatedOrder = await orderModel.findByIdAndUpdate(orderId, update, {
      new: true,
      runValidators: true,
    });
    if (!updatedOrder)
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    return res.status(200).json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Error in updating Order Details:", error);
    res
      .status(500)
      .send({ success: false, message: "Error in updating order details" });
  }
};

export default updateOrder;
