import { useNavigate } from "react-router-dom";
import { FaStethoscope, FaCreditCard, FaWallet, FaBolt, FaCheck, FaArrowRight } from "react-icons/fa6";
import { MdAutoAwesome } from "react-icons/md";

const PAYMENT_FEATURES = [
  { icon: FaCreditCard, label: "Visa / Mastercard", sub: "Credit & debit" },
  { icon: FaWallet, label: "Mobile Wallets", sub: "Supported at checkout" },
  { icon: FaBolt, label: "Instant Confirmation", sub: "Booked in seconds" },
];

/**
 * Explains pricing model (pay-per-booking, free AI quota) and secure checkout.
 */
export default function PricingSection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-14 bg-gradient-to-b from-background to-surface-variant/25">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-primary-light">
            Simple, honest pricing
          </p>
          <h2 className="font-heading font-extrabold text-primary-dark leading-[1.15] tracking-tight text-2xl sm:text-3xl lg:text-4xl mb-3">
            You only pay for what you use
          </h2>
          <p className="text-sm max-w-xl mx-auto text-text-muted">
            No monthly fees. No subscriptions. Book a doctor and pay securely at the time of booking.
            Recharge AI messages whenever you need more. All prices in EGP.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto mb-8">
          <div className="flex flex-col gap-3.5 p-5 rounded-2xl bg-white border border-primary/12 shadow-sm">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-surface-variant/50">
              <FaStethoscope size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold mb-1 text-primary-light">Doctor Consultations</p>
              <p className="text-xl font-extrabold mb-1 text-primary-dark tracking-tight">Pay per booking</p>
              <p className="text-xs text-text-muted">
                Fee shown upfront before you confirm. Video, call, chat, or in-clinic — your choice.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 pt-0.5">
              {["Fee shown before you book", "Cancel before confirmation", "No hidden charges"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-xs text-primary-dark">
                  <FaCheck size={11} className="text-primary" />
                  {t}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3.5 p-5 rounded-2xl bg-white shadow-md">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-surface-variant/50">
              <MdAutoAwesome size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold mb-1 text-primary-light">AI Health Messages</p>
              <p className="text-xl font-extrabold mb-1 text-primary-dark tracking-tight">
                15 <span className="text-base font-bold text-primary">free / day</span>
              </p>
              <p className="text-xs text-text-muted">
                Top up when needed — <strong className="text-primary">20 messages for 10 EGP.</strong> Simple, flexible, no waste.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 pt-0.5">
              {["15 free messages daily — always", "Recharge anytime, no expiry", "Powered by certified medical AI"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-xs text-primary-dark">
                  <FaCheck size={11} className="text-primary" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 mb-8">
          {PAYMENT_FEATURES.map((method) => {
            const Icon = method.icon;
            return (
              <div
                key={method.label}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-primary/12 shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-surface-variant/50">
                  <Icon size={13} className="text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-primary-dark">{method.label}</p>
                  <p className="text-xs text-text-muted">{method.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="cursor-pointer flex items-center gap-2 text-sm font-semibold px-7 py-3.5 rounded-xl bg-primary text-white shadow-floating hover:bg-primary-dark transition-all duration-300 hover:-translate-y-1"
          >
            Get Started — It's Free <FaArrowRight size={14} />
          </button>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <FaCheck size={12} className="text-[#0a8a60]" />
            No registration fee · No credit card required
          </div>
        </div>
      </div>
    </section>
  );
}
