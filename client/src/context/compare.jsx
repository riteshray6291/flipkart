import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const CompareContext = createContext(null);
const STORAGE_KEY = "product-comparison";
export const MAX_COMPARE_ITEMS = 3;

const readSavedItems = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.slice(0, MAX_COMPARE_ITEMS) : [];
  } catch {
    return [];
  }
};

// eslint-disable-next-line react/prop-types
const CompareProvider = ({ children }) => {
  const [items, setItems] = useState(readSavedItems);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Keep comparison usable when browser storage is unavailable.
    }
  }, [items]);

  const toggleCompare = useCallback((product) => {
    setItems((current) =>
      current.some((item) => item.id === product.id)
        ? current.filter((item) => item.id !== product.id)
        : current.length < MAX_COMPARE_ITEMS
          ? [...current, product]
          : current,
    );
  }, []);

  const removeCompare = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearCompare = useCallback(() => setItems([]), []);

  return (
    <CompareContext.Provider
      value={{ items, toggleCompare, removeCompare, clearCompare }}
    >
      {children}
    </CompareContext.Provider>
  );
};

const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context)
    throw new Error("useCompare must be used inside CompareProvider");
  return context;
};

export { CompareProvider, useCompare };
