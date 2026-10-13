/* eslint-disable react/jsx-key */
import Pagination from "@mui/material/Pagination";
import { useState, useEffect } from "react";
import MinCategory from "../../components/MinCategory";
import Product from "../../components/ProductListing/Product";
import { useLocation, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Spinner from "./../../components/Spinner";
import axios from "axios";
import SeoData from "../../SEO/SeoData";
import SideFilter from "../../components/ProductListing/SideFilter";
import { useAuth } from "../../context/auth";
import { fetchCatalog, fetchProductCategories } from "../../utils/productApi";

const Products = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { auth, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const [price, setPrice] = useState([0, 200000]);
  // console.log(location.search);
  const category = searchParams.get("category") || "";
  const [ratings, setRatings] = useState(0);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSource, setProductSource] = useState("");
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);

  // pagination----->
  const [currentPage, setCurrentPage] = useState(1);
  const [productsCount, setProductsCount] = useState(0);
  const productsPerPage = 8;
  // Calculate the total number of pages
  const totalPages = Math.ceil(productsCount / productsPerPage);
  // Calculate the range of products to display on the current page
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  //updating the products to display on current page
  const currentProducts = products.slice(startIndex, endIndex);

  useEffect(() => {
    let active = true;
    fetchProductCategories()
      .then((options) => {
        if (active) setCategoryOptions(options);
      })
      .catch((error) => {
        console.error("Error fetching product categories:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  // Handle page change
  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  const handleCategoryChange = (nextCategory) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextCategory) {
      nextSearchParams.set("category", nextCategory);
    } else {
      nextSearchParams.delete("category");
    }
    setSearchParams(nextSearchParams);
  };

  useEffect(() => {
    let active = true;
    const fetchFilteredData = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const catalog = await fetchCatalog({
          category,
          query: new URLSearchParams(location.search).get("q") || "",
        });
        if (!Array.isArray(catalog.products)) {
          throw new Error("The catalog returned an invalid product list.");
        }
        if (active) {
          setCatalogProducts(catalog.products);
          setProductSource(catalog.source);
          setCategoryOptions((previous) => catalog.categories || previous);
          setCurrentPage(1);
        }
      } catch (error) {
        console.error("Error fetching catalog products:", error);
        if (active) {
          setLoadError(
            error.response?.data?.message ||
              error.message ||
              "Products are temporarily unavailable.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchFilteredData();
    return () => {
      active = false;
    };
  }, [category, location.search, retryCount]);

  useEffect(() => {
    const query = new URLSearchParams(location.search)
      .get("q")
      ?.trim()
      .toLowerCase();
    const filteredProducts = catalogProducts.filter((product) => {
      if (
        !product ||
        !product.id ||
        !product.title ||
        !product.image ||
        !product.category ||
        !Number.isFinite(Number(product.price))
      ) {
        return false;
      }

      const productRating = Number(product.rating?.rate) || 0;
      return (
        Number(product.price) >= price[0] &&
        Number(product.price) <= price[1] &&
        productRating >= Number(ratings) &&
        (!query ||
          `${product.title} ${product.description} ${product.category}`
            .toLowerCase()
            .includes(query))
      );
    });
    setProducts(filteredProducts);
    setProductsCount(filteredProducts.length);
    setCurrentPage(1);
  }, [catalogProducts, location.search, price, ratings]);

  useEffect(() => {
    // getting user wishlist items from server
    const fetchWishlistItems = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/v1/user/wishlist`,
          {
            headers: {
              Authorization: auth?.token,
            },
          },
        );
        setWishlistItems(res.data.wishlistItems);
      } catch (error) {
        console.error("Error fetching data from wishlist product page:", error);
        //server error
        error.response?.status === 500 &&
          toast.error("Error in Fetching Wishlist Items!", {
            toastId: "error",
          });
      }
    };
    auth?.token && !isAdmin && fetchWishlistItems();
  }, [auth?.token, isAdmin]);

  return (
    <>
      <SeoData title="All Products | Flipkart" />

      <MinCategory />
      <main className="w-full pt-2 pb-5 sm:mt-0">
        {/* <!-- row --> */}
        <div className="flex gap-3 mt-2 sm:mt-2 sm:mx-3 m-auto ">
          {/* <!-- sidebar column  --> */}
          <SideFilter
            price={price}
            category={category}
            categories={categoryOptions}
            ratings={ratings}
            setPrice={setPrice}
            setCategory={handleCategoryChange}
            setRatings={setRatings}
          />
          {/* <!-- sidebar column  --> */}

          {/* <!-- search column --> */}
          <div className="flex-1 relative ">
            {!loading && !loadError && productSource === "demo" && (
              <p className="mb-2 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                Demo catalog: add Flipkart Affiliate credentials to the backend
                to load live Flipkart products.
              </p>
            )}
            {/* No products found */}
            {!loading && !loadError && products?.length === 0 && (
              <div className="flex flex-col items-center justify-start gap-3 bg-white shadow-sm rounded-sm p-6 sm:p-16 sm:min-h-[750px] ">
                <img
                  draggable="true"
                  className="w-1/2 h-44 object-contain"
                  src="https://static-assets-web.flixcart.com/www/linchpin/fk-cp-zion/img/error-no-search-results_2353c5.png"
                  alt="Search Not Found"
                />
                <h1 className="text-2xl font-medium text-gray-900">
                  Sorry, no results found!
                </h1>
                <p className="text-xl text-center text-primary-grey">
                  Please check the spelling or try searching for something else.
                </p>
              </div>
            )}

            {!loading && loadError && (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 bg-white p-8 text-center">
                <h1 className="text-2xl font-medium">
                  Products are temporarily unavailable
                </h1>
                <p className="text-gray-600">{loadError}</p>
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                  className="rounded-sm bg-[#2874f0] px-5 py-2.5 font-medium text-white"
                >
                  Try again
                </button>
              </div>
            )}

            {loading ? (
              <Spinner />
            ) : (
              !loadError &&
              products?.length !== 0 && (
                <div className="flex flex-col gap-2 pb-4 justify-center items-center w-full overflow-hidden bg-white">
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-4 w-full place-content-start overflow-hidden pb-4 min-h-[750px] ">
                    {currentProducts?.map((product) => (
                      <Product
                        key={product.id}
                        {...product}
                        wishlistItems={wishlistItems}
                        setWishlistItems={setWishlistItems}
                      />
                    ))}
                  </div>
                  {productsCount > productsPerPage && (
                    <Pagination
                      count={totalPages}
                      page={currentPage}
                      onChange={handlePageChange}
                      color="primary"
                    />
                  )}
                </div>
              )
            )}
          </div>
          {/* <!-- search column --> */}
        </div>
        {/* <!-- row --> */}
      </main>
    </>
  );
};

export default Products;
