import { Outlet } from "react-router-dom";
import Navbar from "../navbar";

/**
 * Layout wrapper that renders the Navbar above routed content.
 * Used for all non-auth pages that need the navigation bar.
 */
export default function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}
