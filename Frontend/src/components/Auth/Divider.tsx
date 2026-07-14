export default function Divider() {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="h-px bg-outline-variant/50 flex-grow" />
      <span className="text-[10px] lg:text-[11px] font-semibold uppercase tracking-widest text-outline">
        OR
      </span>
      <div className="h-px bg-outline-variant/50 flex-grow" />
    </div>
  );
}
