import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaStethoscope,
} from "react-icons/fa6";
import { MdMenu, MdClose } from "react-icons/md";

const NAV_LINKS = [
  { label: "Chat with AI", to: "/ai-chat" },
  { label: "Find a Doctor", to: "/doctors" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="absolute inset-0 bg-white/88 backdrop-blur-md border-b border-primary/8" />
      <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link
          to="/"
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-primary-light">
            <FaStethoscope size={15} className="text-white" />
          </div>
          <span className="text-lg font-extrabold text-primary-dark tracking-tight">
            Tabibi
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="text-sm font-medium text-primary hover:text-primary-dark transition-colors duration-150"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/doctor-login"
            className="text-sm font-semibold px-4 py-2 rounded-xl text-primary hover:bg-surface-variant/40 transition-colors duration-150 flex items-center gap-1.5"
          >
            Doctor Login
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold px-4 py-2 rounded-lg text-primary hover:text-primary-dark transition-colors duration-150"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
          >
            Get Started Free
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <Link
            to="/register"
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark shadow-md transition-all duration-200"
          >
            Get Started Free
          </Link>
          <button
            className="p-2 rounded-lg text-primary cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <MdClose size={22} /> : <MdMenu size={22} />}
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 z-50 px-6 pb-5 pt-4 flex flex-col gap-4 bg-white/98 backdrop-blur-xl border-b border-primary/10 shadow-lg">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className="text-base font-medium text-primary-dark px-1"
            >
              {link.label}
            </Link>
          ))}

          <div className="h-px bg-surface-variant my-1" />

          <Link
            to="/doctor-login"
            onClick={() => setIsOpen(false)}
            className="text-base font-medium text-primary-dark px-1"
          >
            Doctor Login
          </Link>
          <Link
            to="/login"
            onClick={() => setIsOpen(false)}
            className="text-base font-medium text-primary-dark px-1"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            onClick={() => setIsOpen(false)}
            className="text-center text-sm font-semibold px-5 py-3 rounded-xl bg-primary text-white mt-1"
          >
            Get Started Free
          </Link>
        </div>
      )}
    </header>
  );
};

export default Navbar;
