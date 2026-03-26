"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-full w-16 flex-col items-center border-r border-gray-200 bg-white py-6">
      {/* Logo */}
      <div className="mb-10 flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white shadow-sm">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-1 flex-col gap-6">
        <Link
          href="/"
          className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            pathname === "/"
              ? "bg-gray-100 text-black"
              : "text-gray-400 hover:bg-gray-50 hover:text-black"
          }`}
          title="Active Workflow"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          {pathname === "/" && (
            <div className="absolute -left-3 h-4 w-1 rounded-r-full bg-black" />
          )}
        </Link>

        <Link
          href="/history"
          className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            pathname === "/history"
              ? "bg-gray-100 text-black"
              : "text-gray-400 hover:bg-gray-50 hover:text-black"
          }`}
          title="History"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {pathname === "/history" && (
            <div className="absolute -left-3 h-4 w-1 rounded-r-full bg-black" />
          )}
        </Link>
      </nav>

      {/* Profile Placeholder */}
      <div className="mt-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-500">
        PA
      </div>
    </aside>
  );
}
