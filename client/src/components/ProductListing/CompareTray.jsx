import { useEffect, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { useCompare } from "../../context/compare";

const formatPrice = (price) =>
  Number.isFinite(Number(price))
    ? `₹${Number(price).toLocaleString("en-IN")}`
    : "—";

const CompareTray = () => {
  const { items, removeCompare, clearCompare } = useCompare();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  useEffect(() => {
    if (items.length < 2) setIsOpen(false);
  }, [items.length]);

  if (!items.length) return null;

  const rows = [
    { label: "Price", value: (item) => formatPrice(item.price) },
    {
      label: "Original price",
      value: (item) => formatPrice(item.originalPrice),
    },
    { label: "Category", value: (item) => item.category || "—" },
    { label: "Brand", value: (item) => item.brand || "—" },
    {
      label: "Rating",
      value: (item) =>
        item.rating ? `${item.rating.toFixed(1)} / 5` : "Not rated",
    },
    {
      label: "Highlights",
      value: (item) =>
        item.highlights?.length ? item.highlights.join(", ") : "—",
    },
    {
      label: "Source",
      value: (item) =>
        item.source === "affiliate"
          ? "Flipkart"
          : item.source === "demo"
            ? "Demo catalog"
            : "Store",
    },
  ];

  return (
    <>
      <aside className="fixed bottom-4 left-1/2 z-[120] w-[min(94vw,760px)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <p className="font-semibold text-slate-900">Compare products</p>
            <p className="text-xs text-slate-500">
              {items.length} of 3 selected · select at least 2
            </p>
          </div>
          <div className="flex max-w-full flex-1 gap-2 overflow-x-auto sm:flex-none">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 sm:w-40"
              >
                <img
                  className="h-9 w-9 shrink-0 object-contain"
                  src={item.image}
                  alt=""
                />
                <span className="min-w-0 flex-1 truncate text-xs">
                  {item.title}
                </span>
                <button
                  type="button"
                  onClick={() => removeCompare(item.id)}
                  aria-label={`Remove ${item.title} from comparison`}
                  className="text-slate-500 hover:text-red-600"
                >
                  <CloseIcon fontSize="small" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={items.length < 2}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-[#2874f0] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <CompareArrowsIcon fontSize="small" /> Compare
          </button>
          <button
            type="button"
            onClick={clearCompare}
            className="px-1 text-xs font-medium text-slate-500 hover:text-red-600"
          >
            Clear
          </button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setIsOpen(false)
          }
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-title"
            className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2
                  id="compare-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Product comparison
                </h2>
                <p className="text-sm text-slate-500">
                  Compare prices, ratings and key details side by side.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close comparison"
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <CloseIcon />
              </button>
            </header>
            <div className="max-h-[calc(90vh-82px)] overflow-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 w-36 bg-slate-50 p-3 text-slate-600">
                      Details
                    </th>
                    {items.map((item) => (
                      <th
                        key={item.id}
                        className="min-w-48 border-l p-4 align-top font-normal"
                      >
                        <img
                          className="mx-auto h-28 w-full object-contain"
                          src={item.image}
                          alt={item.title}
                        />
                        <p className="mt-2 line-clamp-2 font-semibold text-slate-900">
                          {item.title}
                        </p>
                        {item.productUrl && (
                          <a
                            href={item.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-xs font-semibold text-blue-700 hover:underline"
                          >
                            View on Flipkart
                          </a>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-t">
                      <th
                        scope="row"
                        className="sticky left-0 bg-slate-50 p-3 font-medium text-slate-700"
                      >
                        {row.label}
                      </th>
                      {items.map((item) => (
                        <td
                          key={item.id}
                          className="border-l p-3 align-top text-slate-700"
                        >
                          {row.value(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default CompareTray;
