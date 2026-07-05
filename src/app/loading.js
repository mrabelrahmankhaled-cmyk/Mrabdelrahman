export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#F8F9FA]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-[#2A9D8F]/10 border-t-[#2A9D8F] rounded-full animate-spin"></div>
        <div className="flex flex-col items-center">
            <h2 className="text-xl font-black text-[#264653] tracking-tighter">منصة عبدالرحمن خالد</h2>
            <p className="text-xs text-[#2A9D8F] font-bold animate-pulse mt-1">جاري التحميل...</p>
        </div>
      </div>
    </div>
  );
}
