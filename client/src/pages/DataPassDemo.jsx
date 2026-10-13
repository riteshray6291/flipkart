import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const DataPassDemo = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [products, setProducts] = useState([]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/v1/auth/register`,
        {
          name: form.name,
          email: form.email,
          phone: "9999999999",
          password: form.password,
          address: "Demo address",
          isSeller: false,
        },
      );

      setResponseData(res.data);
      toast.success("Data sent to backend successfully!");
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Failed to send data to backend",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProducts = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/v1/product/filtered-products`,
      );
      setProducts(res.data.products || res.data || []);
      toast.success("Products loaded from backend");
    } catch (error) {
      console.error(error);
      toast.error("Unable to load products");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">
          Send Data to Backend
        </h1>
        <p className="text-gray-600 mt-2">
          Use this page to pass data from the frontend to your backend API.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-lg rounded-xl p-6 border border-gray-200"
        >
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Register Test User
          </h2>

          <div className="space-y-4">
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              required
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              required
            />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              required
            />
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Optional message"
              rows="4"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? "Sending..." : "Send Data to Backend"}
          </button>
        </form>

        <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Backend Response
            </h2>
            <button
              type="button"
              onClick={handleLoadProducts}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Load Products
            </button>
          </div>

          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto min-h-[220px] whitespace-pre-wrap">
            {responseData
              ? JSON.stringify(responseData, null, 2)
              : "No data yet. Submit the form or load products."}
          </pre>
        </div>
      </div>

      <div className="mt-10 bg-white shadow-lg rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Products from Backend
        </h2>

        {products.length === 0 ? (
          <p className="text-gray-500">No products loaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((product) => (
              <div
                key={product._id || product.id || product.name}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <h3 className="font-bold text-gray-800">
                  {product.name || "Unnamed Product"}
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  {product.description || "No description"}
                </p>
                <p className="mt-3 font-semibold text-blue-600">
                  ${product.price || 0}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataPassDemo;
