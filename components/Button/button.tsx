import { ButtonProps } from "@/type/type";
import React from "react";
export default function Button({
  value,
  className = "",
  loading = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${className} w-full py-3 text-white font-semibold rounded-lg transition 
        ${loading ? "bg-orange-400 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700"}`}
      disabled={loading}
    >
      {value}
    </button>
  );
}