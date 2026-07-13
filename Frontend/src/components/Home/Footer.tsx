import { Link } from "react-router-dom";
import { FaStethoscope } from "react-icons/fa6";

/**
 * Site footer with branding, copyright, and quick links.
 */
export default function Footer() {
  return (
    <footer className="border-t border-surface-variant">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-primary-light">
            <FaStethoscope size={13} className="text-white" />
          </div>
          <span className="font-bold text-primary-dark tracking-tight">Tabibi</span>
        </Link>

        <p className="text-xs text-text-muted">
          © {new Date().getFullYear()} Tabibi Health. Licensed by the Egyptian Ministry of Health.
        </p>

        <div className="flex items-center gap-5 text-xs text-text-muted">
          <Link to="/doctors" className="hover:text-primary transition-colors duration-150">
            Find a Doctor
          </Link>
          <Link to="/ai-chat" className="hover:text-primary transition-colors duration-150">
            Chat with AI
          </Link>
          <Link to="/doctor-register" className="hover:text-primary transition-colors duration-150">
            Join as a Doctor
          </Link>
        </div>
      </div>
    </footer>
  );
}
