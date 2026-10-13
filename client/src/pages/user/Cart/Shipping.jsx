import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaCheck,
  FaCreditCard,
  FaLock,
  FaMoneyBillWave,
  FaUniversity,
  FaWallet,
} from "react-icons/fa";
import { useCart } from "../../../context/cart";
import { useAuth } from "../../../context/auth";
import states from "../../../utils/states";
import SeoData from "../../../SEO/SeoData";

const API_URL = (
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_API ||
  "http://localhost:8080"
).replace(/\/$/, "");
const paymentMethods = [
  {
    id: "upi",
    title: "UPI",
    subtitle: "Google Pay, PhonePe, Paytm",
    icon: FaWallet,
  },
  {
    id: "card",
    title: "Card",
    subtitle: "Debit or credit card",
    icon: FaCreditCard,
  },
  {
    id: "netbanking",
    title: "Net banking",
    subtitle: "Choose your bank",
    icon: FaUniversity,
  },
  {
    id: "cod",
    title: "Cash on Delivery",
    subtitle: "Pay when it arrives",
    icon: FaMoneyBillWave,
  },
];
const availablePaymentMethods = import.meta.env.PROD
  ? paymentMethods.filter(({ id }) => id === "cod")
  : paymentMethods;

const getCheckoutKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const Shipping = () => {
  const [cartItems, , , , , , , , setCartAfterOrder] = useCart();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const retryOrderId = searchParams.get("retry");
  const checkoutKey = useRef(getCheckoutKey());
  const [paymentMethod, setPaymentMethod] = useState(
    import.meta.env.PROD ? "cod" : "upi",
  );
  const [paymentProvider, setPaymentProvider] = useState("Google Pay");
  const [simulatedOutcome, setSimulatedOutcome] = useState("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedOrderId, setFailedOrderId] = useState(retryOrderId || "");
  const [retryOrder, setRetryOrder] = useState(null);
  const [retryLoading, setRetryLoading] = useState(Boolean(retryOrderId));
  const [failureMessage, setFailureMessage] = useState("");
  const [address, setAddress] = useState({
    address: "",
    city: "",
    country: "IN",
    state: "",
    landmark: "",
    pincode: "",
    phoneNo: "",
  });

  useEffect(() => {
    if (!auth?.token) return;
    axios
      .get(`${API_URL}/api/v1/user/shipping-info`, {
        headers: { Authorization: auth.token },
      })
      .then(({ data }) =>
        setAddress((current) => ({ ...current, ...data.shippingInfo })),
      )
      .catch((error) =>
        toast.error(
          error.response?.data?.message || "Unable to load your saved address.",
        ),
      );
  }, [auth?.token]);

  useEffect(() => {
    if (!auth?.token || !retryOrderId) return;
    if (import.meta.env.PROD) {
      toast.error(
        "Online payment retries are unavailable. Contact support for help with this order.",
      );
      navigate("/user/orders", { replace: true });
      return;
    }
    axios
      .get(`${API_URL}/api/v1/user/orders/${retryOrderId}`, {
        headers: { Authorization: auth.token },
      })
      .then(({ data }) => {
        const order = data.orderDetails;
        if (
          order.paymentStatus !== "FAILED" &&
          order.paymentStatus !== "failed"
        ) {
          navigate("/user/orders", { replace: true });
          return;
        }
        setRetryOrder(order);
        setPaymentMethod(order.paymentMethod);
        setFailureMessage(
          "Retrying your previously failed demo payment. No money was charged.",
        );
      })
      .catch((error) => {
        toast.error(
          error.response?.data?.message ||
            "Unable to load this order for payment retry.",
        );
        navigate("/user/orders", { replace: true });
      })
      .finally(() => setRetryLoading(false));
  }, [auth?.token, retryOrderId, navigate]);

  const checkoutItems = retryOrder?.products || cartItems;
  const calculatedSubtotal = checkoutItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );
  const subtotal = retryOrder?.subtotal ?? calculatedSubtotal;
  const totalDiscount =
    retryOrder?.discount ??
    subtotal -
      checkoutItems.reduce(
        (sum, item) =>
          sum + Number(item.discountPrice || 0) * Number(item.quantity || 0),
        0,
      );
  const payable = retryOrder?.amount ?? subtotal - totalDiscount;
  const itemCount = checkoutItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const updateAddress = (field) => (event) =>
    setAddress((current) => ({ ...current, [field]: event.target.value }));

  const submitCheckout = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (
      !retryOrderId &&
      (!/^\d{6}$/.test(String(address.pincode)) ||
        !/^\d{10}$/.test(String(address.phoneNo)))
    ) {
      toast.error("Enter a valid 6-digit pincode and 10-digit phone number.");
      return;
    }
    setIsSubmitting(true);
    setFailureMessage("");
    try {
      if (!retryOrderId) {
        await axios.put(`${API_URL}/api/v1/user/shipping-info`, address, {
          headers: { Authorization: auth?.token },
        });
      }
      if (!import.meta.env.PROD && paymentMethod !== "cod")
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      const { data } = await axios.post(
        `${API_URL}/api/v1/user/payments/simulate`,
        {
          paymentMethod,
          outcome: paymentMethod === "cod" ? "success" : simulatedOutcome,
          idempotencyKey: checkoutKey.current,
          ...(failedOrderId ? { orderId: failedOrderId } : {}),
        },
        { headers: { Authorization: auth?.token } },
      );

      if (data.paymentResult === "failure") {
        setFailedOrderId(data.order?._id || "");
        setFailureMessage(
          "Demo payment failed. No money was charged. Retry this order or choose another demo result.",
        );
        return;
      }
      setCartAfterOrder(data.cartItems || []);
      navigate(`/shipping/confirm?order=${data.order._id}`);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Checkout could not be completed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SeoData title="Checkout | Flipkart" />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          to={retryOrderId ? "/user/orders" : "/cart"}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1769aa] hover:text-[#0b4f87]"
        >
          <FaArrowLeft aria-hidden="true" />{" "}
          {retryOrderId ? "Back to my orders" : "Back to cart"}
        </Link>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1769aa]">
              Secure checkout
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Complete your order
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-sm bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
            <FaLock className="text-emerald-600" aria-hidden="true" />
            {import.meta.env.PROD
              ? "Cash on delivery is available."
              : "Demo only. No real payment details required."}
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)]">
          <form onSubmit={submitCheckout} className="space-y-5">
            {retryOrderId ? (
              <section className="rounded-sm bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-[#1769aa]">
                  Payment retry
                </p>
                <h2 className="mt-1 font-bold text-slate-900">
                  Order #{retryOrderId.slice(-8).toUpperCase()}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your original delivery address and order total will be kept.
                </p>
              </section>
            ) : null}
            {!retryOrderId && (
              <section className="overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#2874f0] text-sm font-bold text-white">
                    1
                  </span>
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Delivery address
                    </h2>
                    <p className="text-xs text-slate-500">
                      Where should we send your order?
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">
                      Street address
                    </span>
                    <input
                      required
                      autoComplete="street-address"
                      value={address.address || ""}
                      onChange={updateAddress("address")}
                      className="w-full rounded-sm border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2874f0] focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-slate-600">
                      City
                    </span>
                    <input
                      required
                      autoComplete="address-level2"
                      value={address.city || ""}
                      onChange={updateAddress("city")}
                      className="w-full rounded-sm border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2874f0] focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-slate-600">
                      State
                    </span>
                    <select
                      required
                      autoComplete="address-level1"
                      value={address.state || ""}
                      onChange={updateAddress("state")}
                      className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2874f0] focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select state</option>
                      {states.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-slate-600">
                      Pincode
                    </span>
                    <input
                      required
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="postal-code"
                      value={address.pincode || ""}
                      onChange={updateAddress("pincode")}
                      className="w-full rounded-sm border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2874f0] focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-slate-600">
                      Mobile number
                    </span>
                    <input
                      required
                      inputMode="numeric"
                      maxLength={10}
                      autoComplete="tel"
                      value={address.phoneNo || ""}
                      onChange={updateAddress("phoneNo")}
                      className="w-full rounded-sm border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2874f0] focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">
                      Landmark{" "}
                      <span className="font-normal text-slate-400">
                        (optional)
                      </span>
                    </span>
                    <input
                      value={address.landmark || ""}
                      onChange={updateAddress("landmark")}
                      className="w-full rounded-sm border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2874f0] focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
              </section>
            )}

            <section className="overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#2874f0] text-sm font-bold text-white">
                  2
                </span>
                <div>
                  <h2 className="font-bold text-slate-900">Payment method</h2>
                  <p className="text-xs text-slate-500">
                    Choose a simulated payment option
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-[190px_1fr]">
                <div className="border-b border-slate-100 sm:border-b-0 sm:border-r">
                  {availablePaymentMethods.map(
                    ({ id, title, subtitle, icon: Icon }) => (
                      <button
                        type="button"
                        key={id}
                        disabled={Boolean(retryOrderId) && id !== paymentMethod}
                        onClick={() => setPaymentMethod(id)}
                        className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 disabled:cursor-not-allowed disabled:opacity-40 ${paymentMethod === id ? "bg-blue-50 text-[#1558a6]" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <Icon className="shrink-0" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold">
                            {title}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {subtitle}
                          </span>
                        </span>
                        {paymentMethod === id && (
                          <FaCheck
                            className="ml-auto shrink-0 text-[#2874f0]"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ),
                  )}
                </div>
                <div className="min-h-48 p-5">
                  {paymentMethod === "upi" && (
                    <>
                      <p className="text-sm font-semibold text-slate-800">
                        Choose a demo app
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {["Google Pay", "PhonePe", "Paytm"].map((provider) => (
                          <button
                            type="button"
                            key={provider}
                            onClick={() => setPaymentProvider(provider)}
                            className={`rounded-sm border px-2 py-3 text-xs font-semibold ${paymentProvider === provider ? "border-[#2874f0] bg-blue-50 text-[#1558a6]" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}
                          >
                            {provider}
                          </button>
                        ))}
                      </div>
                      <p className="mt-4 text-xs leading-5 text-slate-500">
                        Simulation only. No UPI ID, PIN, OTP, or bank
                        credentials are requested.
                      </p>
                    </>
                  )}
                  {paymentMethod === "card" && (
                    <>
                      <p className="text-sm font-semibold text-slate-800">
                        Demo card checkout
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Use the simulation controls below. No card number,
                        expiry, or CVV is collected or saved.
                      </p>
                      <p className="mt-3 rounded-sm bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        Test reference: 4242 4242 4242 4242
                      </p>
                    </>
                  )}
                  {paymentMethod === "netbanking" && (
                    <>
                      <label
                        className="block text-sm font-semibold text-slate-800"
                        htmlFor="demo-bank"
                      >
                        Select a demo bank
                      </label>
                      <select
                        id="demo-bank"
                        className="mt-3 w-full max-w-sm rounded-sm border border-slate-300 bg-white px-3 py-2.5 text-sm"
                        value={paymentProvider}
                        onChange={(event) =>
                          setPaymentProvider(event.target.value)
                        }
                      >
                        {[
                          "State Bank of India",
                          "HDFC Bank",
                          "ICICI Bank",
                          "Axis Bank",
                        ].map((bank) => (
                          <option key={bank}>{bank}</option>
                        ))}
                      </select>
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        Simulation only. You will not be asked to sign in to
                        your bank.
                      </p>
                    </>
                  )}
                  {paymentMethod === "cod" && (
                    <div className="flex items-start gap-3 rounded-sm bg-emerald-50 p-4 text-sm text-emerald-900">
                      <FaMoneyBillWave
                        className="mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <p>
                        Pay the delivery partner when your order arrives.
                        Payment status will remain pending until delivery.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {paymentMethod !== "cod" && !import.meta.env.PROD && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Demo result
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { value: "success", label: "Simulate success" },
                      { value: "failure", label: "Simulate failure" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={simulatedOutcome === option.value}
                        onClick={() => setSimulatedOutcome(option.value)}
                        className={`rounded-sm border px-3 py-2 text-xs font-bold transition-colors ${simulatedOutcome === option.value ? (option.value === "success" ? "border-emerald-600 bg-emerald-600 text-white" : "border-rose-600 bg-rose-600 text-white") : "border-slate-300 bg-white text-slate-600 hover:border-slate-500"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {!import.meta.env.PROD && (
              <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-bold tracking-wide text-amber-900">
                DEMO PAYMENT — NO REAL MONEY CHARGED
              </div>
            )}
            {failureMessage && (
              <div
                role="alert"
                className="rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              >
                {failureMessage}
              </div>
            )}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                retryLoading ||
                (retryOrderId ? !retryOrder : cartItems.length === 0)
              }
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#fb641b] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#e95a16] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-64"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {paymentMethod === "cod"
                    ? "Placing order..."
                    : "Simulating payment..."}
                </>
              ) : retryLoading ? (
                "Loading order..."
              ) : paymentMethod === "cod" ? (
                `Place order · ₹${payable.toLocaleString("en-IN")}`
              ) : (
                `${failedOrderId ? "Retry demo payment" : "Pay now"} · ₹${payable.toLocaleString("en-IN")}`
              )}
            </button>
          </form>

          <aside className="overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-20">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Your order
                </p>
                <h2 className="mt-1 font-bold text-slate-900">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </h2>
              </div>
              {!retryOrderId && (
                <Link
                  to="/cart"
                  className="text-xs font-bold text-[#1769aa] hover:underline"
                >
                  Edit cart
                </Link>
              )}
            </div>
            <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto px-5">
              {checkoutItems.map((item) => (
                <div key={item.productId} className="flex gap-3 py-4">
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
                    {(
                      Number(item.discountPrice) * Number(item.quantity)
                    ).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
              {checkoutItems.length === 0 && (
                <p className="py-6 text-sm text-slate-500">
                  Your cart is empty.
                </p>
              )}
            </div>
            <div className="space-y-3 border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span className="font-semibold text-emerald-700">
                  − ₹{totalDiscount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery</span>
                <span className="font-semibold text-emerald-700">FREE</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-slate-300 pt-3 text-base font-bold text-slate-900">
                <span>Total payable</span>
                <span>₹{payable.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-[11px] leading-4 text-slate-500">
                Final prices and stock are verified by the server when you place
                the order.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
};

export default Shipping;
