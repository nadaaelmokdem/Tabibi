import React, { useState, useRef, useEffect } from "react";
import { FiImage, FiSend, FiUser } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi";
import type Message from "../../types/Message";

import { getTextDirection } from "../../utils/textUtils";

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#474553] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
        />
      ))}
    </span>
  );
}

export function MessageBubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  const isTyping = msg.text === "...";
  const textDir = getTextDirection(msg.text);

  return (
    <div
      className={`flex gap-[12px] sm:gap-[16px] ${isMe ? "max-w-[95%] sm:max-w-[85%] self-end flex-row-reverse" : "max-w-[95%] sm:max-w-[85%]"}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-[4px] ${isMe ? "bg-[#e5deff] text-[#474553]" : "bg-[#6a5acd] text-[#f0ebff]"}`}
      >
        {isMe ? (
          <FiUser className="text-[18px]" />
        ) : (
          <HiSparkles className="text-[18px]" />
        )}
      </div>
      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl p-3 sm:p-[16px] shadow-[0px_4px_20px_rgba(42,36,85,0.05)] ${isMe ? "bg-[#5140b3] text-[#ffffff] rounded-tr-sm" : "bg-[#ffffff] border border-[#e5deff] text-[#1a1345] rounded-tl-sm"}`}
        >
          {isTyping && !isMe ? (
            <TypingDots />
          ) : (
            <p
              dir={textDir}
              className={`text-[14px] sm:text-[16px] leading-[1.5] sm:leading-[1.6] font-normal whitespace-pre-wrap ${isMe ? "" : "text-[#1a1345]"}`}
            >
              {msg.text}
            </p>
          )}
        </div>
        <span className="text-[10px] sm:text-[12px] leading-[1] font-medium text-[#787584] mt-[4px] px-1">
          {msg.timestamp}
        </span>
      </div>
    </div>
  );
}

export function ChatInput({
  onSendMessage,
  isLoading,
  disabled = false,
  acceptedFileTypes,
  onFileUpload,
}: {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  acceptedFileTypes?: string;
  onFileUpload?: (file: File) => void;
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textDir = getTextDirection(text);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
      ta.style.overflowY = ta.scrollHeight > 128 ? "auto" : "hidden";
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSendMessage(text);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[#ffffff] border-t border-[#e5deff] p-3 sm:p-[16px] shrink-0 shadow-[0px_-4px_20px_rgba(42,36,85,0.03)] z-10 pb-safe">
      <div className="max-w-4xl mx-auto flex flex-col gap-[4px]">
        <div className="relative flex items-center gap-[8px] sm:gap-[12px] bg-[#f6f1ff] rounded-xl border border-[#e5deff] focus-within:border-[#5140b3] focus-within:ring-1 focus-within:ring-[#5140b3] transition-all p-[4px]">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={acceptedFileTypes}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (acceptedFileTypes && !acceptedFileTypes.split(',').some(type => {
                  const t = type.trim();
                  return t.startsWith('.') ? file.name.toLowerCase().endsWith(t.toLowerCase()) : file.type.match(new RegExp(t.replace('*', '.*')));
                })) {
                  alert("Invalid file type.");
                  if (e.target) e.target.value = "";
                  return;
                }
                if (onFileUpload) {
                  onFileUpload(file);
                }
              }
              if (e.target) {
                e.target.value = "";
              }
            }}
          />
          {onFileUpload && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer p-2 sm:p-[12px] text-[#474553] hover:text-[#5140b3] transition-colors shrink-0 rounded-lg hover:bg-[#eae5ff]"
            >
              <FiImage className="h-5 w-5" />
            </button>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Chat is disabled..." : "Type your message..."}
            rows={1}
            disabled={disabled}
            dir={textDir}
            className="w-full bg-transparent border-none focus:ring-0 outline-none resize-none max-h-32 min-h-[44px] py-[10px] sm:py-[12px] px-[4px] text-[14px] sm:text-[16px] leading-[1.5] sm:leading-[1.6] font-normal text-[#1a1345] placeholder-[#474553]/50 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || isLoading || disabled}
            className="cursor-pointer p-2 sm:p-[12px] mb-0.5 sm:mb-0 bg-[#5140b3] text-[#ffffff] hover:bg-[#5d4cbf] transition-colors shrink-0 rounded-lg shadow-[0px_4px_20px_rgba(42,36,85,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSend className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
