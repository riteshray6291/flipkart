import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import MinCategory from "../../../components/MinCategory";
import Spinner from "../../../components/Spinner";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/auth";
import SeoData from "../../../SEO/SeoData";

const API_URL = (
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_API ||
  "http://localhost:8080"
).replace(/\/$/, "");
const isFailed = (status) => ["FAILED", "failed"].includes(status);
const statusStyle = (status) => {
  if (isFailed(status)) return "bg-rose-50 text-rose-700";
  if (["PAID", "paid"].includes(status))
    return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-800";
};

const Orders = () => {
  const { auth } = useAuth();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API_URL}/api/v1/user/orders`, {
        headers: { Authorization: auth?.token },
      })
      .then(({ data }) => {
        if (!cancelled) setOrders(data.orders || []);
      })
      .catch((error) => {
        if (!cancelled)
          toast.error(
            error.response?.data?.message || "Unable to load your orders.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auth?.token]);

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      `${order._id} ${order.orderStatus} ${order.paymentStatus} ${order.products?.map((item) => item.name).join(" ")}`
        .toLowerCase()
        .includes(query),
    );
  }, [orders, search]);

  return (
    <>
      <SeoData title="My Orders | Flipkart" />
      <MinCategory />
      <main className="mx-auto min-h-[60vh] w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#1769aa]">
              Your account
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              My Orders
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </p>
          </div>
          <label className="flex w-full items-center gap-2 rounded-sm border border-slate-300 bg-white px-3 py-2.5 sm:max-w-sm">
            <SearchIcon sx={{ fontSize: 19 }} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
              placeholder="Search orders or products"
              className="min-w-0 flex-1 text-sm outline-none"
            />
          </label>
        </div>

        {loading ? (
          <Spinner />
        ) : visibleOrders.length === 0 ? (
          <section className="flex flex-col items-center gap-2 rounded-sm bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-[#2874f0]">
              <SearchIcon />
            </div>
            <h2 className="mt-2 text-lg font-bold text-slate-900">
              {orders.length ? "No matching orders" : "No orders yet"}
            </h2>
            <p className="text-sm text-slate-500">
              {orders.length
                ? "Try a different order ID or product name."
                : "Your next great find is waiting."}
            </p>
            {!orders.length && (
              <Link
                to="/products"
                className="mt-3 rounded-sm bg-[#2874f0] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                Explore products
              </Link>
            )}
          </section>
        ) : (
          <div className="space-y-4">
            {visibleOrders.map((order) => {
              const failed = isFailed(order.paymentStatus);
              const statusLabel = String(
                order.orderStatus || "Confirmed",
              ).replaceAll("_", " ");
              return (
                <article
                  key={order._id}
                  className="overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                      <span className="text-slate-500">
                        ORDER PLACED{" "}
                        <strong className="ml-1 font-semibold text-slate-800">
                          {new Date(order.createdAt).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </strong>
                      </span>
                      <span className="text-slate-500">
                        ORDER ID{" "}
                        <strong className="ml-1 font-semibold text-slate-800">
                          {order._id.slice(-10).toUpperCase()}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`rounded-sm px-2.5 py-1 text-[11px] font-bold uppercase ${statusStyle(order.paymentStatus)}`}
                      >
                        {order.paymentStatus === "PENDING" ||
                        order.paymentStatus === "pending"
                          ? "Payment pending"
                          : order.paymentStatus}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        ₹{Number(order.amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <img
                        src={order.products?.[0]?.image}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded-sm bg-slate-50 object-contain"
                      />
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-semibold text-slate-900">
                          {order.products?.[0]?.name || "Order items"}
                        </p>
                        {order.products?.length > 1 && (
                          <p className="mt-1 text-xs text-slate-500">
                            and {order.products.length - 1} more{" "}
                            {order.products.length === 2 ? "item" : "items"}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-slate-500">
                          {statusLabel} ·{" "}
                          {order.products?.reduce(
                            (sum, item) => sum + Number(item.quantity || 0),
                            0,
                          )}{" "}
                          items
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:min-w-40 sm:items-end">
                      <Link
                        to={`/user/orders/order_details/${order._id}`}
                        className="rounded-sm border border-slate-300 px-4 py-2 text-center text-xs font-bold text-[#1769aa] hover:bg-blue-50"
                      >
                        View details
                      </Link>
                      {failed && (
                        <Link
                          to={`/shipping?retry=${order._id}`}
                          className="rounded-sm bg-[#fb641b] px-4 py-2 text-center text-xs font-bold text-white hover:bg-[#e95a16]"
                        >
                          Retry payment
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
};

export default Orders;
