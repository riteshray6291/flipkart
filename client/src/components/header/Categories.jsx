import fashion from "../../assets/images/Categories/fashion.png";
import electronics from "../../assets/images/Categories/electronics.png";
import home from "../../assets/images/Categories/home.png";
import beauty from "../../assets/images/Categories/beauty.png";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchProductCategories } from "../../utils/productApi";

const categoryIcons = {
  Mobiles: electronics,
  Electronics: electronics,
  Men: fashion,
  Women: fashion,
  Fashion: fashion,
  "Home and Furniture": home,
  Appliances: home,
  Jewelry: beauty,
  "Beauty and More": beauty,
};

const Categories = () => {
  const [catNav, setCatNav] = useState([{ id: "", name: "All Products" }]);

  useEffect(() => {
    let active = true;
    fetchProductCategories()
      .then((options) => {
        if (active) setCatNav(options);
      })
      .catch((error) => {
        console.error("Error fetching product categories:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="hidden sm:block bg-white p-0 min-w-full px-12 shadow overflow-hidden">
      <div className="flex items-center justify-between group">
        {catNav.slice(0, 9).map((item) => (
          <Link
            to={
              item.id
                ? `/products?category=${encodeURIComponent(item.id)}`
                : "/products"
            }
            className="flex flex-col gap-1 items-center p-2"
            key={item.id || "all"}
          >
            <div className="h-16 w-16 ">
              <img
                draggable="false"
                className="h-full w-full object-contain"
                src={categoryIcons[item.name] || electronics}
                alt={item.name}
              />
            </div>
            <span className="text-sm text-gray-800 font-medium group-hover:text-primary-blue">
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Categories;
