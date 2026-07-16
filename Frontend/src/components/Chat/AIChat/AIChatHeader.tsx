import { HiSparkles } from "react-icons/hi";
import { TbLayoutSidebarRightCollapse, TbArrowLeft } from "react-icons/tb";
import { MdOutlineAccountBalanceWallet } from "react-icons/md";
import type { AiQuotaResponse } from "../../../services/AIChat";
import type Contact from "../../../types/Contact";

interface AIChatHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  activeContact: Contact;
  quota: AiQuotaResponse | null;
  navigate: (path: string | number) => void;
  onRechargeClick: () => void;
}

export default function AIChatHeader({
  isSidebarOpen,
  setIsSidebarOpen,
  activeContact,
  quota,
  navigate,
  onRechargeClick
}: AIChatHeaderProps) {
  return (
    <div className="bg-white px-4 sm:px-6 py-4 border-b border-surface-variant flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 sticky top-0 z-20 shadow-sm shrink-0">
      <div className="flex items-center gap-3 w-full lg:w-auto">
        <button onClick={() => navigate(-1)} className="md:hidden text-on-surface-variant p-1 -ml-2 rounded-lg hover:bg-surface-container-high transition-colors">
           <TbArrowLeft className="text-2xl" />
        </button>
        {!isSidebarOpen && (
          <button
            className="cursor-pointer p-2 -ml-2 mr-1 text-on-surface-variant hover:text-primary-dark hover:bg-surface-container-high rounded-lg transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <TbLayoutSidebarRightCollapse className="text-[24px]" />
          </button>
        )}
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-light to-primary text-white flex items-center justify-center font-bold shadow-md text-lg border-2 border-white shrink-0">
          <HiSparkles className="text-[20px]" />
        </div>
        <div>
          <h2 className="font-extrabold text-on-surface leading-tight text-[17px]">{activeContact.name}</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            <span className="text-[12px] font-semibold text-outline">Online</span>
          </div>
        </div>
      </div>

      {quota && (
        <div className="flex items-center justify-between sm:justify-end gap-3 bg-surface-container border border-surface-variant px-3 py-2 rounded-xl shadow-sm w-full lg:w-auto mt-2 lg:mt-0">
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <MdOutlineAccountBalanceWallet className="text-[18px] text-on-surface-variant" />
            <p className="text-xs font-semibold text-on-surface-variant">Usage</p>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 sm:flex-none sm:w-32">
            <div className="flex justify-between text-[10px] font-bold text-on-surface uppercase tracking-wide">
              <span>Free Daily</span>
              <span>{quota.freeAiMessages}/15</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(quota.freeAiMessages / 15) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-surface-variant ml-2">
            <span className="text-[10px] font-bold text-on-surface uppercase tracking-wide mr-2">
              Premium
            </span>
            <span className="text-[14px] font-extrabold text-primary">
              {quota.premiumAiMessages}
            </span>
          </div>
          <button
            onClick={onRechargeClick}
            className="cursor-pointer bg-primary text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1 shrink-0 ml-2"
          >
            Recharge
          </button>
        </div>
      )}
    </div>
  );
}
