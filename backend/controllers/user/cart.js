import asyncHandler from "express-async-handler";

const getCart = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    cartItems: req.user.cart || [],
    saveLaterItems: req.user.saveLater || [],
  });
});

const saveCart = asyncHandler(async (req, res) => {
  const { cartItems, saveLaterItems } = req.body;
  if (!Array.isArray(cartItems) || !Array.isArray(saveLaterItems)) {
    return res
      .status(400)
      .json({ success: false, message: "Cart data must be arrays." });
  }

  const validItems = [...cartItems, ...saveLaterItems].every(
    (item) =>
      item &&
      typeof item === "object" &&
      item.productId &&
      Number.isInteger(Number(item.quantity)) &&
      Number(item.quantity) > 0,
  );
  if (!validItems) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Each item needs a product ID and positive quantity.",
      });
  }

  req.user.cart = cartItems;
  req.user.saveLater = saveLaterItems;
  await req.user.save();
  return res
    .status(200)
    .json({
      success: true,
      cartItems: req.user.cart,
      saveLaterItems: req.user.saveLater,
    });
});

const getShippingInfo = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json({ success: true, shippingInfo: req.user.shippingInfo || {} });
});

const saveShippingInfo = asyncHandler(async (req, res) => {
  const { address, city, country, state, landmark, pincode, phoneNo } =
    req.body;
  if (!address || !city || !country || !state || !pincode || !phoneNo) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Complete all required shipping details.",
      });
  }

  req.user.shippingInfo = {
    address,
    city,
    country,
    state,
    landmark: landmark || "",
    pincode: String(pincode),
    phoneNo: String(phoneNo),
  };
  await req.user.save();
  return res
    .status(200)
    .json({ success: true, shippingInfo: req.user.shippingInfo });
});

export { getCart, saveCart, getShippingInfo, saveShippingInfo };
