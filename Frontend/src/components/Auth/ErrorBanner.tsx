import type { ErrorBannerProps } from "../../types/props";

export default function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl transition-all animate-fadeIn">
      <p className="text-red-600 text-xs lg:text-sm font-medium text-center">
        {message}
      </p>
    </div>
  );
}
