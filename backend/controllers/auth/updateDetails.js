import userModel from "../../models/userModel.js";
import asyncHandler from "express-async-handler";

export const updateDetailsController = asyncHandler(async (req, res) => {
  const { newName, newEmail, newPhone } = req.body;
  if (!newName && !newEmail && !newPhone) {
    return res
      .status(400)
      .json({ success: false, message: "No profile changes were provided." });
  }
  if (newName) req.user.name = String(newName).trim();
  if (newEmail) {
    const email = String(newEmail).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid email address." });
    }
    const existing = await userModel.exists({
      email,
      _id: { $ne: req.user._id },
    });
    if (existing)
      return res
        .status(409)
        .json({ success: false, message: "Email address is already in use." });
    req.user.email = email;
  }
  if (newPhone) {
    if (!/^\+?[\d\s()-]{7,20}$/.test(String(newPhone))) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid phone number." });
    }
    req.user.phone = String(newPhone).trim();
  }
  await req.user.save();
  return res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      address: req.user.address,
      role: req.user.role,
    },
  });
});
