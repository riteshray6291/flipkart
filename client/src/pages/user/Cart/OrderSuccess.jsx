import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import axios from "axios";
import { FaArrowRight, FaBoxOpen } from "react-icons/fa";
import { useAuth } from "../../../context/auth";
import Spinner from "../../../components/Spinner";
import SeoData from "../../../SEO/SeoData";

const API_URL = (
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_API ||
  ""
).replace(/\/$/, "");
const paymentLabels = {
  upi: "UPI",
  card: "Debit / Credit Card",
  cod: "Cash on Delivery",
  netbanking: "Net Banking",
};

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");
  const { auth } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!orderId || !auth?.token) {
      setErrorMessage(
        "We could not find this order. Open your order history to view recent purchases.",
      );
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    axios
      .get(`${API_URL}/api/v1/user/orders/${orderId}`, {
        headers: { Authorization: auth.token },
      })
      .then(({ data }) => {
        if (!cancelled) setOrder(data.orderDetails);
      })
      .catch((error) => {
        if (!cancelled)
          setErrorMessage(
            error.response?.data?.message ||
              "Unable to load your order details.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auth?.token, orderId]);

  const deliveryDate = order
    ? new Date(new Date(order.createdAt).getTime() + 5 * 24 * 60 * 60 * 1000)
    : null;
  const paymentStatus = order?.paymentStatus?.toUpperCase();

  return (
    <>
      <SeoData title="Order placed | Flipkart" />
      <main className="mx-auto min-h-[65vh] w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {loading ? (
          <Spinner />
        ) : errorMessage ? (
          <section className="mx-auto max-w-xl rounded-sm bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <h1 className="text-xl font-bold text-slate-900">
              Order details unavailable
            </h1>
            <p className="mt-2 text-sm text-slate-600">{errorMessage}</p>
            <Link
              to="/user/orders"
              className="mt-5 inline-flex items-center gap-2 rounded-sm bg-[#2874f0] px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              View my orders <FaArrowRight aria-hidden="true" />
            </Link>
          </section>
        ) : (
          order && (
            <div className="overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-8 text-center sm:px-10">
                <CheckCircleOutlineIcon
                  sx={{ fontSize: 58 }}
                  className="text-emerald-600"
                />
                <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                  Order Placed Successfully!
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Your order is confirmed. We’ll keep you updated as it moves.
                </p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-sm bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-emerald-200">
                  <FaBoxOpen className="text-emerald-600" aria-hidden="true" />{" "}
                  Order ID: {order._id}
                </p>
              </div>
              <div className="grid gap-0 md:grid-cols-[1.3fr_0.7fr]">
                <section className="divide-y divide-slate-100 px-5 sm:px-8">
                  <div className="py-5">
                    <h2 className="font-bold text-slate-900">
                      Items in this order
                    </h2>
                    {order.products.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-0"
                      >
                        <img
                          src={item.image}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-sm bg-slate-50 object-contain"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-slate-800">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Qty {item.quantity}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-slate-900">
                          ₹
                          {(item.discountPrice * item.quantity).toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
                <aside className="border-t border-slate-100 bg-slate-50 px-5 py-6 md:border-l md:border-t-0 sm:px-8">
                  <h2 className="font-bold text-slate-900">Order summary</h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Total paid</dt>
                      <dd className="font-bold text-slate-900">
                        ₹{Number(order.amount).toLocaleString("en-IN")}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Payment method</dt>
                      <dd className="text-right font-medium text-slate-800">
                        {paymentLabels[order.paymentMethod] ||
                          order.paymentMethod}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Payment status</dt>
                      <dd
                        className={`font-bold ${paymentStatus === "PENDING" ? "text-amber-700" : "text-emerald-700"}`}
                      >
                        {paymentStatus === "PENDING"
                          ? "Pay on delivery"
                          : paymentStatus}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Order status</dt>
                      <dd className="font-medium text-slate-800">
                        {order.orderStatus}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Estimated delivery</dt>
                      <dd className="text-right font-medium text-slate-800">
                        {deliveryDate.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-5 border-t border-slate-200 pt-4 text-[11px] font-bold tracking-wide text-amber-800">
                    DEMO PAYMENT — NO REAL MONEY CHARGED
                  </p>
                </aside>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-5 sm:flex-row sm:justify-end sm:px-8">
                <Link
                  to="/products"
                  className="rounded-sm border border-slate-300 px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Continue shopping
                </Link>
                <Link
                  to="/user/orders"
                  className="rounded-sm bg-[#2874f0] px-5 py-3 text-center text-sm font-bold text-white hover:bg-blue-700"
                >
                  View my orders
                </Link>
              </div>
            </div>
          )
        )}
      </main>
    </>
  );
};

export default OrderSuccess;
