/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import StarIcon from "@mui/icons-material/Star";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { Link } from "react-router-dom";
import { getDiscount } from "../../utils/functions";
import { useEffect, useState } from "react";
import ScrollToTopOnRouteChange from "../../utils/ScrollToTopOnRouteChange";
import { toast } from "react-toastify";
import axios from "axios";
import { useAuth } from "../../context/auth";
import { MAX_COMPARE_ITEMS, useCompare } from "../../context/compare";
import { useCart } from "../../context/cart";

const Product = ({
  _id,
  id,
  source,
  productUrl,
  images,
  image,
  name,
  title,
  category,
  ratings,
  numOfReviews,
  rating,
  price,
  mrp,
  discountPrice,
  wishlistItems,
  setWishlistItems,
  highlights,
  keySpecs,
  brand,
  stock,
  seller,
}) => {
  const { auth, isAdmin } = useAuth();
  const { items: compareItems, toggleCompare } = useCompare();
  const [, , addItems] = useCart();
  const productId = _id || id;
  const productName = name || title || "Product";
  const imageUrl = images?.[0]?.url || image;
  const ratingValue = Number(
    typeof ratings === "number" ? ratings : rating?.rate || 0,
  );
  const reviewCount = numOfReviews ?? rating?.count ?? 0;
  const currentPrice = discountPrice ?? price ?? 0;
  const originalPrice = mrp ?? price ?? currentPrice;
  const canUpdateWishlist = Boolean(_id);
  const compareId = `${source || "store"}:${productId}`;
  const isCompared = compareItems.some((item) => item.id === compareId);
  const isAffiliateProduct = source === "affiliate" && productUrl;
  const ProductLink = isAffiliateProduct ? "a" : Link;
  const productLinkProps = isAffiliateProduct
    ? {
        href: productUrl,
        target: "_blank",
        rel: "noopener noreferrer",
      }
    : {
        to: productId
          ? `/product/${productId}${source ? `?source=${source}` : ""}`
          : "/products",
      };

  //check if item is present in user wishlist or not
  const itemInWishlist = wishlistItems?.some((itemId) => {
    return itemId === productId;
  });

  // Optimistic UI update
  const updateWishlistUI = (add) => {
    setWishlistItems((prev) =>
      add ? [...prev, productId] : prev.filter((item) => item !== productId),
    );
  };

  // add to wishlist function
  const addToWishlistHandler = async () => {
    if (!canUpdateWishlist) return;
    const type = itemInWishlist ? "remove" : "add";
    try {
      // Update the UI before the API call
      updateWishlistUI(type === "add");

      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/v1/user/update-wishlist`,
        { productId: _id, type },
        { headers: { Authorization: auth.token } },
      );
    } catch (error) {
      console.error(error);
      if (error.message.includes("403")) {
        toast.error("Admins are not allowed to add items to the wishlist", {
          toastId: "error",
        });
      } else {
        toast.error("Something went wrong! Please try again later.", {
          toastId: "error",
        });
      }
      // Revert UI update if there is an error
      updateWishlistUI(type !== "add");
    }
  };

  const toggleCompareHandler = () => {
    if (!isCompared && compareItems.length >= MAX_COMPARE_ITEMS) {
      toast.info("Compare up to 3 products at a time.");
      return;
    }
    toggleCompare({
      id: compareId,
      title: productName,
      image: imageUrl,
      category: category || "",
      price: currentPrice,
      originalPrice,
      rating: ratingValue,
      brand: typeof brand === "string" ? brand : brand?.name || "",
      highlights: (highlights || keySpecs || [])
        .slice(0, 5)
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.text || item?.value || item?.key || "",
        )
        .filter(Boolean),
      source: source || "store",
      productUrl,
    });
  };

  const addToCartHandler = () => {
    addItems(
      {
        productId: _id,
        name: productName,
        stock,
        image: imageUrl,
        brandName: brand?.name || "Flipkart",
        price: originalPrice,
        discountPrice: currentPrice,
        seller,
      },
      1,
    );
  };

  return (
    <>
      <ScrollToTopOnRouteChange />
      <div className="relative">
        {/* <!-- wishlist badge --> */}
        <button
          type="button"
          onClick={addToWishlistHandler}
          disabled={!canUpdateWishlist || isAdmin}
          aria-label={
            itemInWishlist ? "Remove from wishlist" : "Add to wishlist"
          }
          className={`${
            itemInWishlist ? "text-red-500" : "hover:text-red-500 text-gray-300"
          }
                    ${isAdmin || !canUpdateWishlist ? "hidden" : ""}
                    absolute z-10  top-2 right-3 cursor-pointer`}
        >
          <FavoriteIcon sx={{ fontSize: "20px" }} />
        </button>
        {productId && (
          <button
            type="button"
            onClick={toggleCompareHandler}
            aria-pressed={isCompared}
            className={`absolute bottom-2 left-2 z-10 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${isCompared ? "border-[#2874f0] bg-[#2874f0] text-white" : "border-slate-200 bg-white text-slate-700 hover:border-[#2874f0] hover:text-[#2874f0]"}`}
          >
            {isCompared ? "Added to compare" : "Compare"}
          </button>
        )}
        {_id && (
          <button
            type="button"
            onClick={addToCartHandler}
            disabled={Number(stock) < 1}
            className="absolute bottom-2 right-2 z-10 rounded-full bg-[#fb641b] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#e85b17] disabled:cursor-not-allowed disabled:bg-slate-400 sm:px-4"
          >
            Add to Cart
          </button>
        )}
        {/* <!-- wishlist badge --> */}
        <ProductLink
          {...productLinkProps}
          className="flex flex-col items-center gap-2 w-full px-4 py-6 relative hover:shadow-lg rounded-sm"
        >
          {/* <!-- image & product title --> */}
          <div className="flex flex-col items-center w-full text-center group">
            <div className="w-44 h-48">
              <img
                draggable="false"
                className="w-full h-full object-contain"
                src={imageUrl}
                alt={productName}
                onError={(event) => {
                  event.currentTarget.style.visibility = "hidden";
                }}
              />
            </div>
          </div>
          {/* <!-- image & product title --> */}

          {/* <!-- product description --> */}
          <div className="flex flex-col gap-2 items-start w-full">
            {category && (
              <span className="text-xs capitalize text-gray-500">
                {category}
              </span>
            )}
            <h2 className="text-sm leading-6 font-[500] mt-4 group-hover:text-primary-blue text-left">
              {productName.length > 55
                ? `${productName.substring(0, 55)}...`
                : productName}
            </h2>
            {/* <!-- rating badge --> */}
            <span className="text-sm text-gray-500 font-medium flex gap-2 items-start justify-between">
              <span className="text-xs px-1.5 py-0.5 bg-[#22ba20] rounded-sm text-white flex items-center gap-0.5">
                {ratingValue.toFixed(1)}
                <StarIcon sx={{ fontSize: "14px" }} />
              </span>
              <span>({reviewCount})</span>
              <span>
                <img
                  draggable="false"
                  className="w-[60px] h-[20px] ml-4 object-contain"
                  src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/fa_62673a.png"
                  alt={productName}
                />
              </span>
            </span>
            {/* <!-- rating badge --> */}

            {/* <!-- price container --> */}
            <div className="flex items-center gap-1.5 text-md font-medium">
              <span>₹{currentPrice.toLocaleString()}</span>
              {originalPrice > currentPrice && (
                <>
                  <span className="text-gray-500 line-through text-xs">
                    ₹{originalPrice.toLocaleString()}
                  </span>
                  <span className="text-xs text-primary-green">
                    {getDiscount(originalPrice, currentPrice)}%&nbsp;off
                  </span>
                </>
              )}
            </div>
            {/* <!-- price container --> */}
          </div>
          {/* <!-- product description --> */}
        </ProductLink>
      </div>
    </>
  );
};

export default Product;
