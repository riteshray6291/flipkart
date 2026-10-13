import { BsSearch } from "react-icons/bs";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCatalog } from "../../utils/productApi";

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  const handleSearch = async (query) => {
    try {
      const catalog = await fetchCatalog({ query });
      setResults(catalog.products.slice(0, 6));
      setOpen(true);
    } catch (error) {
      console.error("Error searching for products:", error);
    }
  };

  const searchTimeout = useRef(null);

  useEffect(() => () => clearTimeout(searchTimeout.current), []);

  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    clearTimeout(searchTimeout.current);
    if (!newQuery.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    searchTimeout.current = setTimeout(() => handleSearch(newQuery), 300);
  };

  //aliter- using use effect-
  //  useEffect(() => {
  //      const delayDebounceFn = setTimeout(() => {
  //          // Call the search function after a delay of 300 milliseconds
  //          handleSearch(query);
  //      }, 300);

  //      // Cleanup the timeout if the user continues typing
  //      return () => clearTimeout(delayDebounceFn);
  //  }, [query, handleSearch]);

  return (
    <>
      <div
        className="w-[100%] sm:w-[70%] relative flex flex-col items-center search-container"
        onBlur={() =>
          setTimeout(() => {
            setOpen(false);
          }, 500)
        }
      >
        <form
          action="/search"
          method="get"
          className="bg-[#f0f5ff] relative w-[100%] rounded-md"
        >
          <div className="flex items-center h-[40px] ">
            <div className=" flex items-center px-2">
              <button type="submit">
                <figure className=" text-slate-500 bg-transparent">
                  <BsSearch />
                </figure>
              </button>
            </div>
            <div className="w-[100%]">
              <input
                type="text"
                name="q"
                title="Search for Products, Brands and More"
                placeholder="Search for Products, Brands and More"
                autoComplete="off"
                className=" bg-transparent w-[100%] border-none outline-none text-[14px] md:text-[16px] p-1 placeholder-gray-600 "
                onChange={handleInputChange}
                value={query}
              />
            </div>
          </div>
        </form>
        {results.length > 0 && open && (
          <ul className="absolute top-[40px] left-0 right-0 pb-2 z-50 w-full bg-white shadow-lg rounded-b-md">
            {results.map((product) => (
              <li key={product.id || product._id}>
                <Link
                  to={`/product/${product.id || product._id}${
                    product.source ? `?source=${product.source}` : ""
                  }`}
                  className="px-5 py-4 h-[50px] hover:bg-[#f0f5ff] flex gap-5"
                  onClick={() => setOpen(false)}
                >
                  <img
                    src={product.image || product.images?.[0]?.url}
                    alt={product.title || product.name || "Product"}
                    className="h-8 w-8 object-contain"
                  />
                  <span>
                    {(product.title || product.name || "Product").length > 40
                      ? `${(product.title || product.name).substring(0, 40)}...`
                      : product.title || product.name || "Product"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default SearchBar;
