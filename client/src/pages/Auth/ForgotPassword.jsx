import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../../context/auth";
import SeoData from "../../SEO/SeoData";

const API_URL = (
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_API ||
  ""
).replace(/\/$/, "");

const ForgotPassword = () => {
  const { auth, LogOut } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword)
      return toast.error("New passwords do not match.");
    setIsSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/v1/auth/forgot-password`,
        { currentPassword, password },
        {
          headers: { Authorization: auth?.token },
        },
      );
      toast.success("Password changed. Please sign in again.");
      LogOut();
      navigate("/login");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to change your password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SeoData
        title="Change Password"
        description="Securely change your password"
      />
      <main className="mx-auto my-12 max-w-lg rounded bg-white p-6 shadow sm:p-10">
        <h1 className="text-2xl font-semibold text-slate-900">
          Change password
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          For your security, confirm your current password before choosing a new
          one.
        </p>
        {!auth?.token ? (
          <p className="mt-6 text-sm">
            Please{" "}
            <Link className="text-blue-700 underline" to="/login">
              sign in
            </Link>{" "}
            before changing your password.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Current password
              <input
                required
                autoComplete="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="mt-1 w-full rounded border p-3"
              />
            </label>
            <label className="block text-sm font-medium">
              New password
              <input
                required
                minLength={8}
                autoComplete="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded border p-3"
              />
            </label>
            <label className="block text-sm font-medium">
              Confirm new password
              <input
                required
                minLength={8}
                autoComplete="new-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded border p-3"
              />
            </label>
            <button
              disabled={isSubmitting}
              className="w-full rounded bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Updating…" : "Change password"}
            </button>
          </form>
        )}
      </main>
    </>
  );
};

export default ForgotPassword;
