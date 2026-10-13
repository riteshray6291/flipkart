import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import UserModel from "../models/userModel.js";

const requireSignIn = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "Authentication required." });
  if (!process.env.JWT_SECRET)
    return res
      .status(503)
      .json({ success: false, message: "Authentication is not configured." });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired session." });
  }

  req.user = await UserModel.findById(decoded._id);
  if (!req.user || req.user.role !== 0) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorised User" });
  }
  next();
});

const requireAuthenticated = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "Authentication required." });
  if (!process.env.JWT_SECRET)
    return res
      .status(503)
      .json({ success: false, message: "Authentication is not configured." });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await UserModel.findById(decoded._id).select("+password");
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired session." });
  }
  if (!req.user)
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired session." });
  next();
});

const isAdmin = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "Authentication required." });
  if (!process.env.JWT_SECRET)
    return res
      .status(503)
      .json({ success: false, message: "Authentication is not configured." });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired session." });
  }
  req.user = await UserModel.findById(decoded._id);
  if (!req.user || req.user.role !== 1) {
    return res
      .status(403)
      .json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
  }
  next();
});

export { requireSignIn, requireAuthenticated, isAdmin };
// import JWT from "jsonwebtoken";
// import userModel from "../models/userModel.js";
// import asyncHandler from "express-async-handler";

// //Protected routes token based
// export const requireSignIn = asyncHandler(async (req, res, next) => {
//     try {
//         const token = req.headers?.authorization;
//         // console.log(token);
//         if (!token) {
//             return res.status(401).send({
//                 success: false,
//                 message: "JWT must be provided",
//                 ok: false,
//             });
//         }
//         const decode = JWT.verify(token, process.env.JWT_SECRET);
//         // Set the user information given in token payload
//         req.user = decode;
//         next();
//     } catch (error) {
//         console.log(error);
//         res.status(500).send({
//             success: false,
//             message: "Invalid JWT",
//         });
//     }
// });

// //ADMIN access
// export const isAdmin = asyncHandler(async (req, res, next) => {
//     try {
//         const user = await userModel.findById(req.user._id);
//         if (user.role !== 1) {
//             return res.status(401).send({
//                 success: false,
//                 message: "User is not Admin",
//                 ok: false,
//             });
//         }
//         next();
//     } catch (error) {
//         console.log(error);
//         res.status(500).send({
//             success: false,
//             error,
//             message: "Error in admin middleware",
//         });
//     }
// });
