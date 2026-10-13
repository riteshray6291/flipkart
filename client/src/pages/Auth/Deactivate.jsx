import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../../context/auth";
import ScrollToTopOnRouteChange from "../../utils/ScrollToTopOnRouteChange";

const Deactivate = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const { auth, LogOut } = useAuth();

  const handleDeactivate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/v1/auth/deactivate`,
        { currentPassword },
        { headers: { Authorization: auth?.token } },
      );
      // console.log(response);

      if (response.status === 200) {
        toast.success(response.data.message);
        LogOut();
        navigate("/");
      }
    } catch (error) {
      console.log(error);
      toast.error(
        error.response?.data?.message || "Unable to deactivate your account.",
      );
    }
  };
  return (
    <>
      <ScrollToTopOnRouteChange />
      <div className="flex flex-col sm:flex-row w-full items-center sm:items-start p-4 h-full ">
        <div className="sm:w-[50%] p-2 sm:border-r-2 h-full">
          <div>
            <div className="text-[16px] font-[500] leading-7 ">
              When you deactivate your account
            </div>
            <div className="text-[12px] text-slate-500 p-4">
              <ul className="list-disc leading-8">
                <li>You are logged out of your Flipkart Account</li>
                <li>Your public profile on Flipkart is no longer visible</li>
                <li>
                  Your reviews/ratings are still visible, while your profile
                  information is shown as ‘unavailable’ as a result of
                  deactivation.
                </li>
                <li>
                  Your wishlist items are no longer accessible through the
                  associated public hyperlink. Wishlist is shown as
                  ‘unavailable’ as a result of deactivation
                </li>
                <li>
                  You will be unsubscribed from receiving promotional emails
                  from Flipkart
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="sm:w-[50%] flex flex-col gap-5 items-center p-2  ">
          <div className="w-full font-[500] text-[16px] text-center leading-7">
            Are you sure you want to leave?
          </div>
          <div className="">
            <form
              action="/deactivate"
              method="post"
              onSubmit={handleDeactivate}
              className="flex flex-col gap-4 items-center w-full"
            >
              <input
                type="password"
                autoComplete="current-password"
                required
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="border-2 p-2 w-[220px] focus:outline-primaryBlue focus:outline-1"
                placeholder="Confirm your password"
              />

              <div className="relative flex items-center">
                <button className="bg-red-600 w-full uppercase text-white text-[14px] font-[500] rounded-sm px-2 py-1">
                  Deactivate
                </button>
              </div>
            </form>
          </div>
          <Link
            to="/user/dashboard"
            className="uppercase text-primaryBlue font-[600] text-[14px] flex items-center justify-center w-full"
          >
            No, Let me Stay
          </Link>
        </div>
      </div>
    </>
  );
};

export default Deactivate;
