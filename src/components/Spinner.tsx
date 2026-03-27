"use client";

export default function Spinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${!className ? "py-12" : ""}`}>
      <div className={`h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-black ${className || ""}`} />
    </div>
  );
}
