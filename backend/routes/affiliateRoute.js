import express from "express";
import {
  FlipkartAffiliateError,
  getAffiliateCategories,
  getAffiliateProduct,
  getAffiliateProducts,
  isAffiliateConfigured,
} from "../services/flipkartAffiliate.js";

const router = express.Router();

const respondWithError = (res, error) => {
  const affiliateError =
    error instanceof FlipkartAffiliateError
      ? error
      : new FlipkartAffiliateError("Flipkart Affiliate API request failed.");
  return res.status(affiliateError.status).send({
    success: false,
    code: affiliateError.code,
    message: affiliateError.message,
  });
};

const respondDemoMode = (res) =>
  res.send({
    success: true,
    source: "demo",
    configured: false,
    message:
      "Flipkart Affiliate credentials are missing. The client may use its labeled demo catalog.",
  });

router.get("/status", (req, res) => {
  res.send({
    configured: isAffiliateConfigured(),
    source: isAffiliateConfigured() ? "affiliate" : "demo",
  });
});

router.get("/categories", async (req, res) => {
  if (!isAffiliateConfigured()) return respondDemoMode(res);
  try {
    return res.send({
      success: true,
      source: "affiliate",
      configured: true,
      categories: await getAffiliateCategories(),
    });
  } catch (error) {
    return respondWithError(res, error);
  }
});

router.get("/products", async (req, res) => {
  if (!isAffiliateConfigured()) return respondDemoMode(res);

  const category = String(req.query.category || "").trim();
  const query = String(req.query.q || "").trim();
  if (category.length > 120 || query.length > 150) {
    return res.status(400).send({
      success: false,
      code: "INVALID_CATALOG_QUERY",
      message: "Category or search query is too long.",
    });
  }

  try {
    const result = await getAffiliateProducts({ category, query });
    return res.send({
      success: true,
      source: "affiliate",
      configured: true,
      ...result,
    });
  } catch (error) {
    return respondWithError(res, error);
  }
});

router.get("/products/:productId", async (req, res) => {
  if (!isAffiliateConfigured()) return respondDemoMode(res);
  const productId = String(req.params.productId || "");
  if (!/^[a-z\d_-]{1,80}$/i.test(productId)) {
    return res.status(400).send({
      success: false,
      code: "INVALID_PRODUCT_ID",
      message: "Invalid Flipkart product ID.",
    });
  }

  try {
    const product = await getAffiliateProduct(productId);
    return res.send({
      success: true,
      source: "affiliate",
      configured: true,
      product,
    });
  } catch (error) {
    return respondWithError(res, error);
  }
});

export default router;
