import { MdAutoAwesome, MdHealthAndSafety, MdSend, MdAttachFile } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { CARD_SHADOW } from "./PatientDashboardHeader";

interface PatientDashboardAIWidgetProps {
  showSystemMessage: boolean;
  systemMessageDoctor: string;
  aiQuota: { freeAiMessages: number, premiumAiMessages: number } | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  handleAiSubmit: () => void;
  onRechargeClick: () => void;
}

export default function PatientDashboardAIWidget({
  showSystemMessage,
  systemMessageDoctor,
  aiQuota,
  fileInputRef,
  aiPrompt,
  setAiPrompt,
  handleAiSubmit,
  onRechargeClick
}: PatientDashboardAIWidgetProps) {
  const navigate = useNavigate();

  return (
    <div className={`relative z-0 mb-2 bg-surface-container-lowest rounded-xl p-6 flex flex-col h-full w-full transition-all duration-300 ${CARD_SHADOW} ${
      showSystemMessage && systemMessageDoctor ? 'col-span-1 md:col-span-12 lg:col-span-8' : 'col-span-1 md:col-span-12'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <MdAutoAwesome className="text-xl" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-on-surface">Tabibi AI</h3>
            <p className="text-xs font-medium text-primary flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {aiQuota && (
            <div className="hidden sm:flex items-center gap-1.5 mr-1 px-3 py-1.5 rounded-full bg-surface-container-high border border-surface-variant/60">
              <span className="text-xs font-medium text-on-surface-variant whitespace-nowrap">
                {aiQuota.freeAiMessages} free left
              </span>
              {aiQuota.premiumAiMessages > 0 && (
                <span className="text-xs font-semibold text-primary whitespace-nowrap">
                  +{aiQuota.premiumAiMessages}
                </span>
              )}
            </div>
          )}
          <button 
            onClick={onRechargeClick}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm whitespace-nowrap"
          >
            <span>Recharge</span>
          </button>
          <button onClick={() => navigate('/ai-chat')} className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/5 border border-primary/20 text-primary rounded-lg text-xs sm:text-sm font-semibold hover:bg-primary/10 transition-colors shadow-sm whitespace-nowrap">
            <MdHealthAndSafety className="text-base sm:text-lg" />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Mini Chat Area */}
      <div className="flex-grow bg-surface-dim/10 rounded-xl p-4 mb-4 border border-surface-variant/60 flex flex-col gap-4 justify-end shadow-inner">
        <div className="flex items-end gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-sm border border-primary/10">
            <MdAutoAwesome className="text-base" />
          </div>
          <div className="bg-surface-container-low p-3.5 rounded-2xl rounded-bl-sm border border-surface-variant/60 max-w-[85%] shadow-sm">
            <p className="text-sm text-on-surface leading-relaxed font-medium">
              Hello! I'm your Tabibi AI assistant. Please describe your symptoms in as much detail as possible, including when they started.
            </p>
          </div>
        </div>
      </div>
      <div className="relative mt-2 flex items-center bg-surface-container-high rounded-xl border border-transparent focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all pl-2 shadow-sm">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              navigate('/ai-chat', { state: { initialPrompt: aiPrompt, attachedFile: file } });
            }
            if (e.target) e.target.value = "";
          }}
        />
        <button onClick={() => fileInputRef.current?.click()} className="cursor-pointer p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full shrink-0" title="Attach file">
          <MdAttachFile className="text-xl" />
        </button>
        <input
          className="flex-1 p-3.5 bg-transparent border-none text-base text-on-surface outline-none placeholder-on-surface-variant/70 min-w-0"
          placeholder="Type your health concern or attach a report..."
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
        />
        <button onClick={handleAiSubmit} className="cursor-pointer p-4 text-primary hover:text-primary/80 transition-colors shrink-0">
          <MdSend className="text-xl" />
        </button>
      </div>
    </div>
  );
}
