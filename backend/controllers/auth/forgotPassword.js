import { comparePassword, hashPassword } from "../../helper/authHelper.js";
import asyncHandler from "express-async-handler";

// This endpoint is an authenticated password change. Email based recovery
// requires a verified, one-time token delivered through a configured mailer.
export const forgotPasswordController = asyncHandler(async (req, res) => {
  const { currentPassword, password } = req.body;
  if (!currentPassword || !password) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Current and new passwords are required.",
      });
  }
  if (
    String(password).length < 8 ||
    Buffer.byteLength(String(password), "utf8") > 72
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message:
          "New password must be at least 8 characters and no more than 72 bytes.",
      });
  }

  const matches = await comparePassword(currentPassword, req.user.password);
  if (!matches)
    return res
      .status(401)
      .json({ success: false, message: "Current password is incorrect." });

  req.user.password = await hashPassword(password);
  await req.user.save();
  return res
    .status(200)
    .json({ success: true, message: "Password changed successfully." });
});
