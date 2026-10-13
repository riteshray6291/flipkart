import assert from "node:assert/strict";
import { after, test } from "node:test";

const affiliateId = "local-test-affiliate";
const affiliateToken = "local-test-token";
const previousAffiliateId = process.env.FLIPKART_AFFILIATE_ID;
const previousAffiliateToken = process.env.FLIPKART_AFFILIATE_TOKEN;
const originalFetch = globalThis.fetch;

process.env.FLIPKART_AFFILIATE_ID = affiliateId;
process.env.FLIPKART_AFFILIATE_TOKEN = affiliateToken;

const { getAffiliateCategories, getAffiliateProduct, getAffiliateProducts } =
  await import("../services/flipkartAffiliate.js");

const apiBase = "https://affiliate-api.flipkart.net";
const feedUrl = `${apiBase}/affiliate/1.0/feeds/${affiliateId}/category/women.json?expiresAt=9999999999999&sig=local-signature`;

const makeProduct = (
  id,
  title,
  categoryNames = ["Clothing", "Women's Clothing"],
) => ({
  productBaseInfoV1: {
    productId: id,
    title,
    productDescription: `${title} description`,
    imageUrls: {
      "400x400": `http://img.fkcdn.com/${id}.jpg`,
    },
    maximumRetailPrice: { amount: 100, currency: "INR" },
    flipkartSellingPrice: { amount: 90, currency: "INR" },
    flipkartSpecialPrice: { amount: 80, currency: "INR" },
    productUrl: `http://dl.flipkart.com/dl/${id}?pid=${id}&affid=${affiliateId}`,
    productBrand: "Example Brand",
    categoryPath: JSON.stringify([
      categoryNames.map((node_name) => ({ node_name })),
    ]),
    attributes: { color: "Blue", size: "M" },
  },
  categorySpecificInfoV1: {
    keySpecs: ["Cotton"],
    detailedSpecs: ["Washable"],
    specificationList: [],
  },
});

const directory = {
  apiGroups: {
    affiliate: {
      apiListings: {
        women_clothing: {
          apiName: "women_clothing",
          availableVariants: {
            "v1.1.0": { get: feedUrl },
          },
        },
        mens_clothing: {
          apiName: "mens_clothing",
          availableVariants: {
            "v1.1.0": {
              get: `${apiBase}/affiliate/1.0/feeds/${affiliateId}/category/men.json?expiresAt=9999999999999&sig=local-signature`,
            },
          },
        },
      },
    },
  },
};

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

after(() => {
  globalThis.fetch = originalFetch;
  if (previousAffiliateId === undefined) {
    delete process.env.FLIPKART_AFFILIATE_ID;
  } else {
    process.env.FLIPKART_AFFILIATE_ID = previousAffiliateId;
  }
  if (previousAffiliateToken === undefined) {
    delete process.env.FLIPKART_AFFILIATE_TOKEN;
  } else {
    process.env.FLIPKART_AFFILIATE_TOKEN = previousAffiliateToken;
  }
});

test("uses the Affiliate directory, category feeds, search, and exact product IDs", async () => {
  const womenProduct = makeProduct("WOMEN123", "Women's Cotton Shirt");
  const searchProduct = makeProduct("WOMEN123", "Women's Cotton Shirt", [
    "Clothing",
    "Women",
  ]);
  const calls = [];
  let rateLimited = false;
  let mismatchedDetailId = false;

  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    calls.push({ url, options });
    assert.equal(options.headers["Fk-Affiliate-Id"], affiliateId);
    assert.equal(options.headers["Fk-Affiliate-Token"], affiliateToken);
    assert.equal(options.redirect, "error");

    if (url.pathname === `/affiliate/api/${affiliateId}.json`) {
      return jsonResponse(directory);
    }
    if (url.pathname.endsWith("/category/women.json")) {
      return rateLimited
        ? jsonResponse({}, 429)
        : jsonResponse({
            productInfoList: [
              { ...womenProduct },
              {
                ...womenProduct,
                productBaseInfoV1: {
                  ...womenProduct.productBaseInfoV1,
                  productId: "WOMEN456",
                  title: "Women's Denim Jacket",
                },
              },
            ],
            nextUrl:
              "https://affiliate-api.flipkart.net/affiliate/1.0/feeds/next.json?expiresAt=1&sig=next",
          });
    }
    if (url.pathname === "/affiliate/1.0/search.json") {
      assert.equal(url.searchParams.get("query"), "shirt");
      assert.equal(url.searchParams.get("resultCount"), "10");
      return jsonResponse({ productInfoList: [searchProduct] });
    }
    if (url.pathname === "/affiliate/1.0/product.json") {
      const productId = mismatchedDetailId
        ? "DIFFERENT123"
        : url.searchParams.get("id");
      return jsonResponse(makeProduct(productId, "Women's Cotton Shirt"));
    }
    throw new Error(`Unexpected Affiliate API request: ${url.pathname}`);
  };

  const categories = await getAffiliateCategories();
  assert.deepEqual(
    categories.map((category) => category.id),
    ["women_clothing", "mens_clothing"],
  );

  const catalog = await getAffiliateProducts({ category: "women" });
  assert.equal(catalog.products.length, 2);
  assert.ok(
    catalog.products.every((product) => product.category === "Women Clothing"),
  );
  assert.equal(catalog.products[0].image, "https://img.fkcdn.com/WOMEN123.jpg");
  assert.ok(
    catalog.products[0].productUrl.startsWith("https://dl.flipkart.com/"),
  );
  assert.equal(catalog.hasMore, true);

  const search = await getAffiliateProducts({
    category: "women",
    query: "shirt",
  });
  assert.equal(search.products.length, 1);
  assert.equal(search.products[0].id, "WOMEN123");

  const product = await getAffiliateProduct("WOMEN123");
  assert.equal(product.id, "WOMEN123");
  assert.equal(product.title, "Women's Cotton Shirt");
  assert.equal(product.price, 80);
  assert.equal(product.description, "Women's Cotton Shirt description");
  assert.ok(
    calls.every(({ url }) => url.hostname === "affiliate-api.flipkart.net"),
  );

  mismatchedDetailId = true;
  await assert.rejects(
    getAffiliateProduct("WOMEN123"),
    (error) => error.status === 404 && error.code === "FLIPKART_NOT_FOUND",
  );

  rateLimited = true;
  await assert.rejects(
    getAffiliateProducts({ category: "women" }),
    (error) => error.status === 429 && error.code === "FLIPKART_RATE_LIMITED",
  );
});
