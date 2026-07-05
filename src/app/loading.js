export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="flex flex-col items-center">
            <h2 className="text-xl font-black text-gray-800 tracking-tighter">SMART CENTER</h2>
            <p className="text-xs text-blue-600 font-bold animate-pulse">جاري التحميل...</p>
        </div>
      </div>
    </div>
  );
}
