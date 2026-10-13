import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import App from "./App.jsx";
import { AuthProvider } from "./context/auth.jsx";
import { CartProvider } from "./context/cart.jsx";
import { CompareProvider } from "./context/compare.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <CartProvider>
      <CompareProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ToastContainer
          style={{ fontSize: "14px", zIndex: 900 }}
          autoClose={2000}
        />
      </CompareProvider>
    </CartProvider>
  </AuthProvider>,
);
