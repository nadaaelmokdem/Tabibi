import { FaStethoscope, FaShieldHalved, FaClock, FaBolt } from "react-icons/fa6";
import { MdAutoAwesome } from "react-icons/md";

const FREE_PERKS = [
  { icon: MdAutoAwesome, title: "15 daily", sub: "Free AI consultations — every single day" },
  { icon: FaStethoscope, title: "2 monthly", sub: "Free GP messages — no booking required" },
  { icon: FaShieldHalved, title: "Encrypted", sub: "All sessions are end-to-end protected" },
  { icon: FaClock, title: "24 / 7", sub: "Verified doctors always available" },
];

/**
 * Highlights the platform's built-in free quotas and no-subscription model.
 */
export default function FreePerksSection() {
  return (
    <section className="relative py-14 bg-gradient-to-b from-surface-variant/25 to-background border-y border-primary/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">

            <h2 className="font-heading font-extrabold text-primary-dark leading-[1.15] tracking-tight text-3xl sm:text-4xl mb-4">
              Serious healthcare{" "}
              <span className="text-primary">that puts you first</span>
            </h2>
            <p className="text-sm leading-relaxed mb-5 text-text-muted max-w-lg mx-auto lg:mx-0">
              Tabibi gives every patient 15 daily free AI consultations and two free monthly General Practitioner messages —
              built into the platform, no strings attached. When you need a doctor, you pay only for that booking.
              Nothing more.
            </p>

            <div className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl mb-5 bg-white border border-primary/15 shadow-sm">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-surface-variant/50">
                <FaBolt size={15} className="text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-primary-dark">Need more AI messages?</p>
                <p className="text-xs text-text-muted">
                  Top up 20 messages for just <strong className="text-primary">10 EGP</strong>
                </p>
              </div>
            </div>

            <p className="text-sm font-medium text-primary-light">
              Doctor consultations are paid at booking — you see the fee upfront, always.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FREE_PERKS.map((perk) => {
              const Icon = perk.icon;
              return (
                <div
                  key={perk.title}
                  className="flex flex-col gap-2.5 p-4 rounded-2xl bg-white border border-primary/10 shadow-sm"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-variant/50">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold mb-0.5 text-primary-dark tracking-tight">{perk.title}</p>
                    <p className="text-xs text-text-muted">{perk.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
