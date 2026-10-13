import express from "express";
import { isAdmin, requireSignIn } from "../middleware/authMiddleware.js";
import getWishlistItems from "../controllers/user/getWishlistItems.js";
import updateWishlist from "../controllers/user/updateWishlist.js";
import getWishlistProducts from "../controllers/user/getWishlistProducts.js";
import simulatePayment from "../controllers/user/simulatePayment.js";
import getOrders from "../controllers/user/getOrders.js";
import getOrderDetail from "../controllers/user/getOrderDetail.js";
import getAdminOrders from "../controllers/user/getAdminOrders.js";
import updateOrder from "../controllers/user/updateOrder.js";
import getAllUserOrder from "../controllers/user/getAllUserOrder.js";
import {
  getCart,
  saveCart,
  getShippingInfo,
  saveShippingInfo,
} from "../controllers/user/cart.js";

//router object
const router = express.Router();

router.get("/cart", requireSignIn, getCart);
router.put("/cart", requireSignIn, saveCart);
router.get("/shipping-info", requireSignIn, getShippingInfo);
router.put("/shipping-info", requireSignIn, saveShippingInfo);
router.post("/payments/simulate", requireSignIn, simulatePayment);

//routing
//get Wishlist Items id
router.get("/wishlist", requireSignIn, getWishlistItems);

//update wishlist Items
router.post("/update-wishlist", requireSignIn, updateWishlist);

// get wishlist products
router.get("/wishlist-products", requireSignIn, getWishlistProducts);

// get user orders
router.get("/orders", requireSignIn, getOrders);
router.get("/orders/:id", requireSignIn, getOrderDetail);
router.get("/order-detail", requireSignIn, getOrderDetail);

//get admin orders
router.get("/admin-orders", isAdmin, getAdminOrders);
router.get("/admin-order-detail", isAdmin, getOrderDetail);

//update order status
router.patch("/update/order-status", isAdmin, updateOrder);

//get all order and delete if possible
router.get("/get-all-order", isAdmin, getAllUserOrder);
export default router;
