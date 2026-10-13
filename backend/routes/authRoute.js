import express from "express";
import { registerController } from "../controllers/auth/registerController.js";
import { loginController } from "../controllers/auth/loginController.js";
import { forgotPasswordController } from "../controllers/auth/forgotPassword.js";
import { updateDetailsController } from "../controllers/auth/updateDetails.js";
import { deactivateController } from "../controllers/auth/deactivateAccount.js";
import {
  isAdmin,
  requireAuthenticated,
  requireSignIn,
} from "../middleware/authMiddleware.js";

//router object
const router = express.Router();

//routing
//REGISTER || METHOD POST
router.post("/register", registerController);

//LOGIN || METHOD POST
router.post("/login", loginController);

//USER EXIST || METHOD POST

// FORGOT PASSWORD ROUTE
router.post("/forgot-password", requireAuthenticated, forgotPasswordController);

//protected route-user
router.get("/user-auth", requireSignIn, (req, res) => {
  try {
    res.status(200).send({
      ok: true,
    });
  } catch (error) {
    console.log(error);
  }
});

//protected Admin route
router.get("/admin-auth", isAdmin, (req, res) => {
  res.status(200).send({
    ok: true,
  });
});

// update details POST route\
router.post("/update-details", requireAuthenticated, updateDetailsController);

// deactivate account
router.post("/deactivate", requireAuthenticated, deactivateController);

export default router;
