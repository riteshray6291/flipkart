const API_BASE = "https://affiliate-api.flipkart.net/affiliate";
const CATEGORY_CACHE_MS = 9 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12000;

let categoryCache;

export class FlipkartAffiliateError extends Error {
  constructor(message, status = 502, code = "FLIPKART_API_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const isAffiliateConfigured = () =>
  Boolean(
    process.env.FLIPKART_AFFILIATE_ID?.trim() &&
    process.env.FLIPKART_AFFILIATE_TOKEN?.trim(),
  );

const getCredentials = () => {
  if (!isAffiliateConfigured()) {
    throw new FlipkartAffiliateError(
      "Flipkart Affiliate API credentials are not configured.",
      503,
      "FLIPKART_NOT_CONFIGURED",
    );
  }

  return {
    affiliateId: process.env.FLIPKART_AFFILIATE_ID.trim(),
    affiliateToken: process.env.FLIPKART_AFFILIATE_TOKEN.trim(),
  };
};

const assertAffiliateUrl = (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new FlipkartAffiliateError("Invalid Flipkart API URL.");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "affiliate-api.flipkart.net" ||
    !url.pathname.startsWith("/affiliate/")
  ) {
    throw new FlipkartAffiliateError("Untrusted Flipkart API URL.");
  }

  return url;
};

const requestJson = async (url) => {
  const safeUrl = assertAffiliateUrl(url);
  const { affiliateId, affiliateToken } = getCredentials();

  let response;
  try {
    response = await fetch(safeUrl, {
      headers: {
        "Fk-Affiliate-Id": affiliateId,
        "Fk-Affiliate-Token": affiliateToken,
        Accept: "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error.name === "TimeoutError";
    throw new FlipkartAffiliateError(
      timedOut
        ? "Flipkart Affiliate API request timed out."
        : "Flipkart Affiliate API is unavailable.",
      timedOut ? 504 : 502,
      timedOut ? "FLIPKART_TIMEOUT" : "FLIPKART_UNAVAILABLE",
    );
  }

  if (!response.ok) {
    const status = response.status === 429 ? 429 : response.status;
    const knownErrors = {
      400: [400, "Flipkart rejected the request parameters."],
      401: [401, "Flipkart rejected the Affiliate ID or API token."],
      403: [403, "Flipkart rejected the signed API request."],
      404: [404, "The requested Flipkart product or category was not found."],
      410: [502, "The signed Flipkart feed URL expired. Retry the request."],
      429: [429, "Flipkart Affiliate API rate limit reached. Retry later."],
      503: [503, "Flipkart Affiliate API is temporarily unavailable."],
    };
    const [mappedStatus, message] = knownErrors[status] || [
      status >= 500 ? 502 : status,
      "Flipkart Affiliate API request failed.",
    ];
    throw new FlipkartAffiliateError(
      message,
      mappedStatus,
      status === 401
        ? "FLIPKART_AUTH_FAILED"
        : status === 429
          ? "FLIPKART_RATE_LIMITED"
          : status === 404
            ? "FLIPKART_NOT_FOUND"
            : "FLIPKART_API_ERROR",
    );
  }

  try {
    return await response.json();
  } catch {
    throw new FlipkartAffiliateError(
      "Flipkart returned an invalid JSON response.",
    );
  }
};

const displayCategoryName = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const getCategoryEntries = (directory) => {
  const listings = directory?.apiGroups?.affiliate?.apiListings;
  if (!listings || typeof listings !== "object") {
    throw new FlipkartAffiliateError(
      "Flipkart returned an invalid product category directory.",
    );
  }

  return Object.entries(listings)
    .map(([id, listing]) => {
      const variants = listing?.availableVariants || {};
      const variant =
        variants["v1.1.0"] ||
        Object.entries(variants)
          .sort(([left], [right]) => right.localeCompare(left))
          .map(([, value]) => value)
          .find((value) => value?.get);
      const feedUrl = variant?.get;

      if (!feedUrl) return null;
      return {
        id,
        name: displayCategoryName(
          listing.apiName || variant.resourceName || id,
        ),
        feedUrl: assertAffiliateUrl(feedUrl).toString(),
      };
    })
    .filter(Boolean);
};

const getCategoryDirectory = async (refresh = false) => {
  if (!refresh && categoryCache && categoryCache.expiresAt > Date.now()) {
    return categoryCache.categories;
  }

  const { affiliateId } = getCredentials();
  const directory = await requestJson(
    `${API_BASE}/api/${encodeURIComponent(affiliateId)}.json`,
  );
  const categories = getCategoryEntries(directory);
  if (categories.length === 0) {
    throw new FlipkartAffiliateError(
      "No product feeds are currently available for this Affiliate account.",
      404,
      "FLIPKART_NO_CATEGORIES",
    );
  }

  categoryCache = {
    categories,
    expiresAt: Date.now() + CATEGORY_CACHE_MS,
  };
  return categories;
};

const parseCategoryPath = (productBase) => {
  const rawPath = productBase?.categoryPath;
  if (typeof rawPath === "string") {
    try {
      const paths = JSON.parse(rawPath);
      return paths
        .flat(2)
        .map((item) => item?.node_name)
        .filter(Boolean);
    } catch {
      return rawPath
        .split(/[>/]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  const pathGroups =
    productBase?.productIdentifier?.categoryPaths?.categoryPath;
  if (!Array.isArray(pathGroups)) return [];
  return pathGroups
    .flat(2)
    .map((item) => item?.title)
    .filter(Boolean);
};

const amount = (value) => {
  const parsed = Number(value?.amount ?? value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    url.protocol = "https:";
    return url.toString();
  } catch {
    return "";
  }
};

const officialProductUrl = (value) => {
  const result = toHttpsUrl(value);
  if (!result) return "";
  const url = new URL(result);
  return url.hostname === "flipkart.com" ||
    url.hostname.endsWith(".flipkart.com")
    ? result
    : "";
};

const normalizeProduct = (entry, categoryName = "") => {
  const productBase =
    entry?.productBaseInfoV1 || entry?.productBaseInfo || entry;
  const attributes = productBase?.productAttributes || productBase;
  const categorySpecific = entry?.categorySpecificInfoV1 || {};
  const categoryPath = parseCategoryPath(productBase);
  const imageUrls = attributes?.imageUrls || {};
  const id =
    productBase?.productId ||
    productBase?.productIdentifier?.productId ||
    attributes?.productId;
  const price =
    amount(attributes?.flipkartSpecialPrice) ??
    amount(attributes?.sellingPrice) ??
    amount(attributes?.flipkartSellingPrice);
  const mrp = amount(attributes?.maximumRetailPrice);
  const image = toHttpsUrl(
    imageUrls["400x400"] ||
      imageUrls["800x800"] ||
      imageUrls["200x200"] ||
      imageUrls.unknown ||
      Object.values(imageUrls).find((value) => typeof value === "string"),
  );

  if (!id || !attributes?.title || !image || price === null) return null;

  return {
    id: String(id),
    source: "affiliate",
    title: attributes.title,
    description: attributes.productDescription || "",
    category: categoryName || categoryPath.at(-1) || "Flipkart product",
    categoryPath,
    image,
    imageUrls,
    price,
    mrp: mrp ?? price,
    productUrl: officialProductUrl(attributes.productUrl),
    brand: attributes.productBrand || "",
    inStock: attributes.inStock !== false,
    rating: null,
    ratingCount: null,
    keySpecs: categorySpecific.keySpecs || [],
    detailedSpecs: categorySpecific.detailedSpecs || [],
    specificationList: categorySpecific.specificationList || [],
    attributes: productBase.attributes || {},
    seller:
      entry?.productShippingInfoV1 || entry?.productShippingBaseInfo || {},
    offers: attributes.offers || [],
  };
};

const groupMatchers = {
  women: /women|female/i,
  men: /(^|[^a-z])mens?([^a-z]|$)|mens|male/i,
  electronics: /electronic|computer|camera|audio|television|tv\b/i,
  mobiles: /mobile|phone|handset/i,
  fashion: /fashion|apparel|clothing|garment|women|mens?/i,
  "home-furniture": /home|furniture|furnishing|decor/i,
  appliances: /appliance|kitchen|refrigerator|washing|air.condition/i,
  jewelry: /jewel|jewellery|jewelry/i,
};

const categoriesForSelection = (categories, selection) => {
  const normalized = String(selection || "")
    .trim()
    .toLowerCase();
  if (!normalized || normalized === "all" || normalized === "all products") {
    return categories;
  }

  const exact = categories.filter(
    (category) => category.id.toLowerCase() === normalized,
  );
  if (exact.length) return exact;

  const matcher = groupMatchers[normalized.replace(/\s+/g, "-")];
  if (matcher) {
    return categories.filter((category) =>
      matcher.test(`${category.id} ${category.name}`),
    );
  }

  return categories.filter(
    (category) => category.name.toLowerCase() === normalized,
  );
};

const mapConcurrent = async (items, concurrency, callback) => {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await callback(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
};

const fetchCategoryProducts = async (category) => {
  let data;
  try {
    data = await requestJson(category.feedUrl);
  } catch (error) {
    if (error.status !== 502 || error.code !== "FLIPKART_API_ERROR") {
      throw error;
    }
    const refreshedCategories = await getCategoryDirectory(true);
    const refreshedCategory = refreshedCategories.find(
      (item) => item.id === category.id,
    );
    if (!refreshedCategory) throw error;
    data = await requestJson(refreshedCategory.feedUrl);
  }

  const list = data?.productInfoList;
  if (!Array.isArray(list)) {
    throw new FlipkartAffiliateError(
      `Flipkart returned an invalid feed for ${category.name}.`,
    );
  }

  return {
    products: list
      .map((item) => normalizeProduct(item, category.name))
      .filter(Boolean),
    hasMore: Boolean(data.nextUrl),
  };
};

const fetchSearchProducts = async (query) => {
  const url = new URL(`${API_BASE}/1.0/search.json`);
  url.searchParams.set("query", query);
  url.searchParams.set("resultCount", "10");
  const data = await requestJson(url.toString());
  if (!Array.isArray(data?.productInfoList)) {
    throw new FlipkartAffiliateError(
      "Flipkart returned an invalid search response.",
    );
  }
  return data.productInfoList
    .map((item) => normalizeProduct(item))
    .filter(Boolean);
};

export const getAffiliateCategories = async () => {
  const categories = await getCategoryDirectory();
  return categories.map(({ id, name }) => ({ id, name }));
};

export const getAffiliateProducts = async ({
  category = "",
  query = "",
} = {}) => {
  const availableCategories = await getCategoryDirectory();
  const selectedCategories = categoriesForSelection(
    availableCategories,
    category,
  );

  if (category && selectedCategories.length === 0) {
    throw new FlipkartAffiliateError(
      "No Flipkart product category matches this selection.",
      404,
      "FLIPKART_CATEGORY_NOT_FOUND",
    );
  }

  let products;
  let hasMore = false;
  if (query.trim()) {
    products = await fetchSearchProducts(query.trim());
    if (category) {
      const normalizedCategory = category.trim().toLowerCase();
      const matcher = groupMatchers[normalizedCategory.replace(/\s+/g, "-")];
      products = products.filter((product) => {
        const productCategories = `${product.category} ${product.categoryPath.join(" ")}`;
        if (matcher) return matcher.test(productCategories);

        return selectedCategories.some((selected) =>
          productCategories.toLowerCase().includes(selected.name.toLowerCase()),
        );
      });
    }
  } else {
    const results = await mapConcurrent(
      selectedCategories,
      3,
      fetchCategoryProducts,
    );
    products = results.flatMap((result) => result.products);
    hasMore = results.some((result) => result.hasMore);
  }

  const uniqueProducts = [
    ...new Map(products.map((item) => [item.id, item])).values(),
  ];
  return {
    products: uniqueProducts,
    categories: availableCategories.map(({ id, name }) => ({ id, name })),
    hasMore,
  };
};

export const getAffiliateProduct = async (productId) => {
  const url = new URL(`${API_BASE}/1.0/product.json`);
  url.searchParams.set("id", productId);
  const data = await requestJson(url.toString());
  const product = normalizeProduct(data);
  if (!product || product.id !== productId) {
    throw new FlipkartAffiliateError(
      "The requested Flipkart product was not found.",
      404,
      "FLIPKART_NOT_FOUND",
    );
  }
  return product;
};
