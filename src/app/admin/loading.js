export default function AdminLoading() {
  return (
    <div className="w-full h-[80vh] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500 font-bold animate-pulse text-sm">جاري تحميل لوحة التحكم...</p>
    </div>
  );
}
