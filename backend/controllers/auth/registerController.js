import { hashPassword, comparePassword } from "../../helper/authHelper.js";
import userModel from "../../models/userModel.js";

//POST REGISTER
export const registerController = async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    if (
      !String(name || "").trim() ||
      !normalizedEmail ||
      !phone ||
      !password ||
      !String(address || "").trim()
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, email, phone, password, and address are required.",
        });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid email address." });
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
            "Password must be at least 8 characters and no more than 72 bytes.",
        });
    }
    if (!/^\+?[\d\s()-]{7,20}$/.test(String(phone))) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid phone number." });
    }

    //check for existing users
    const existingUser = await userModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(200).send({
        success: false,
        message: "Email already registered!",
        errorType: "emailConflict",
      });
    }

    //Register User
    const hashedPassword = await hashPassword(password);

    const user = new userModel({
      name: String(name).trim(),
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      address,
      role: 0,
    });
    await user.save();

    res.status(201).send({
      success: true,
      message: "User Registered Successfully!",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error in Registration",
    });
  }
};
