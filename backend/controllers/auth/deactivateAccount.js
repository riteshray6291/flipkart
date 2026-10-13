import { comparePassword } from "../../helper/authHelper.js";
import asyncHandler from "express-async-handler";

export const deactivateController = asyncHandler(async (req, res) => {
  const { currentPassword } = req.body;
  if (!currentPassword)
    return res
      .status(400)
      .json({
        success: false,
        message: "Confirm your password to deactivate the account.",
      });
  if (!(await comparePassword(currentPassword, req.user.password))) {
    return res
      .status(401)
      .json({ success: false, message: "Password is incorrect." });
  }
  await req.user.deleteOne();
  return res
    .status(200)
    .json({ success: true, message: "Account deactivated successfully." });
});
