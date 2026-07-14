import type { TermsFooterProps } from "../../types/props";

export default function TermsFooter({
  actionText = "continuing",
}: TermsFooterProps) {
  return (
    <p className="text-[10px] lg:text-[11px] leading-[14px] font-medium text-center text-outline mt-0.5">
      By {actionText}, you agree to Tabibi's{" "}
      <span className="text-primary-dark cursor-pointer">Terms of Service</span>{" "}
      and <span className="text-primary-dark cursor-pointer">Privacy Policy</span>.
    </p>
  );
}
