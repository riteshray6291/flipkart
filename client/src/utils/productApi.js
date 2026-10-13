import axios from "axios";

const SERVER_URL = (
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_API ||
  ""
).replace(/\/$/, "");
const DEMO_API_URL = (
  import.meta.env.VITE_DEMO_API_URL || "https://fakestoreapi.com"
).replace(/\/$/, "");

const categoryGroups = [
  {
    id: "electronics",
    name: "Electronics",
    pattern: /electronic|computer|camera|audio|television|\btv\b/i,
  },
  { id: "mobiles", name: "Mobiles", pattern: /mobile|phone|handset/i },
  { id: "men", name: "Men", pattern: /(^|[^a-z])mens?([^a-z]|$)|mens|male/i },
  { id: "women", name: "Women", pattern: /women|female/i },
  {
    id: "fashion",
    name: "Fashion",
    pattern: /fashion|apparel|clothing|garment|women|mens?/i,
  },
  {
    id: "home-furniture",
    name: "Home and Furniture",
    pattern: /home|furniture|furnishing|decor/i,
  },
  {
    id: "appliances",
    name: "Appliances",
    pattern: /appliance|kitchen|refrigerator|washing|air.condition/i,
  },
  { id: "jewelry", name: "Jewelry", pattern: /jewel|jewellery|jewelry/i },
  {
    id: "beauty-more",
    name: "Beauty and More",
    pattern: /beauty|personal|cosmetic|toy|sport|book|grocery|food|health/i,
  },
];

const normalizeCategories = (categories = []) => {
  const validCategories = categories.filter(
    (category) => category?.id && category?.name,
  );
  const matchedIds = new Set();
  const result = [{ id: "", name: "All Products" }];

  categoryGroups.forEach((group) => {
    const matches = validCategories.filter((category) =>
      group.pattern.test(`${category.id} ${category.name}`),
    );
    if (matches.length) {
      result.push(group);
      matches.forEach((category) => matchedIds.add(category.id));
    }
  });

  validCategories.forEach((category) => {
    if (!matchedIds.has(category.id)) result.push(category);
  });
  return result;
};

const getDemoCategories = async () => {
  const response = await axios.get(`${DEMO_API_URL}/products/categories`);
  const categories = Array.isArray(response.data)
    ? response.data.map((name) => ({ id: name, name }))
    : [];
  return normalizeCategories(categories);
};

const demoCategoryMatches = (product, selection) => {
  const normalizedSelection = String(selection || "")
    .trim()
    .toLowerCase();
  if (!normalizedSelection || normalizedSelection === "all") return true;
  const group = categoryGroups.find(
    (item) => item.id === normalizedSelection.replace(/\s+/g, "-"),
  );
  if (group) return group.pattern.test(String(product.category || ""));
  return String(product.category || "").toLowerCase() === normalizedSelection;
};

const fetchDemoCatalog = async ({ category = "", query = "" } = {}) => {
  const response = await axios.get(`${DEMO_API_URL}/products`);
  if (!Array.isArray(response.data)) {
    throw new Error("The demo catalog returned an invalid response.");
  }
  const searchTerm = query.trim().toLowerCase();
  const products = response.data
    .filter((product) => product && demoCategoryMatches(product, category))
    .filter(
      (product) =>
        !searchTerm ||
        `${product.title || ""} ${product.description || ""} ${product.category || ""}`
          .toLowerCase()
          .includes(searchTerm),
    )
    .map((product) => ({ ...product, source: "demo" }));

  return {
    products,
    source: "demo",
    categories: await getDemoCategories(),
    hasMore: false,
  };
};

export const fetchProductCategories = async () => {
  const response = await axios.get(`${SERVER_URL}/api/v1/affiliate/categories`);
  if (response.data?.source === "demo") return getDemoCategories();
  if (!Array.isArray(response.data?.categories)) {
    throw new Error("The Flipkart category directory is unavailable.");
  }
  return normalizeCategories(response.data.categories);
};

export const fetchCatalog = async ({ category = "", query = "" } = {}) => {
  const response = await axios.get(`${SERVER_URL}/api/v1/affiliate/products`, {
    params: { category, q: query },
  });
  if (response.data?.source === "demo") {
    return fetchDemoCatalog({ category, query });
  }
  if (!Array.isArray(response.data?.products)) {
    throw new Error("The Flipkart product feed is unavailable.");
  }
  return {
    ...response.data,
    categories: normalizeCategories(response.data.categories),
  };
};

export const fetchProductById = async (productId, source = "") => {
  if (source === "affiliate") {
    const response = await axios.get(
      `${SERVER_URL}/api/v1/affiliate/products/${encodeURIComponent(productId)}`,
    );
    const product = response.data?.product;
    return String(product?.id) === String(productId) ? product : null;
  }

  if (source === "demo" || /^\d+$/.test(productId)) {
    const response = await axios.get(`${DEMO_API_URL}/products/${productId}`);
    return { ...response.data, source: "demo" };
  }

  if (/^[a-f\d]{24}$/i.test(productId)) {
    const response = await axios.get(
      `${SERVER_URL}/api/v1/product/${encodeURIComponent(productId)}`,
    );
    return response.data?.product;
  }

  return null;
};
