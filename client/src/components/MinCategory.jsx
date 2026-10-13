import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProductCategories } from "../utils/productApi";

const MinCategory = () => {
  const [categories, setCategories] = useState([
    { id: "", name: "All Products" },
  ]);

  useEffect(() => {
    let active = true;
    fetchProductCategories()
      .then((options) => {
        if (active) setCategories(options);
      })
      .catch((error) => {
        console.error("Error fetching product categories:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="hidden sm:block bg-white w-full px-2 sm:p-0 overflow-hidden border-b">
      <div className="flex items-center justify-between p-0.5">
        {categories.slice(0, 10).map((el) => (
          <Link
            to={
              el.id
                ? `/products?category=${encodeURIComponent(el.id)}`
                : "/products"
            }
            key={el.id || "all"}
            className="text-sm p-2 text-gray-800 font-medium hover:text-primaryBlue flex items-center gap-0.5 group"
          >
            {el.name}
            <span className="text-gray-400 group-hover:text-primaryBlue group-hover:rotate-180 transition-all ease-out">
              <ExpandMoreIcon sx={{ fontSize: "16px" }} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default MinCategory;
