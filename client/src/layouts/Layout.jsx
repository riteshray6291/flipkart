import CompareTray from "../components/ProductListing/CompareTray";
import Footer from "../components/footer/Footer";
import Header from "../components/header/Header";
import Routers from "../routes/Routers";

const Layout = () => {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] w-full bg-[#f1f3f6]">
        <Routers />
      </main>
      <Footer />
      <CompareTray />
    </>
  );
};

export default Layout;
