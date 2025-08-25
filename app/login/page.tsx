"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/userApi";
import Button from "../components/Button/button";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const data = await loginUser(form);

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("uid", data.userId);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-orange-50 to-orange-100">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md space-y-6">
        <h2 className="text-4xl font-extrabold text-gray-800 text-center">Login</h2>

        {error && (
          <p className="text-red-500 text-center text-sm font-medium animate-pulse">{error}</p>
        )}

        <div className="flex flex-col gap-5">
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition shadow-sm hover:shadow-md"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition shadow-sm hover:shadow-md"
            required
          />
        </div>

        <Button
          value={loading ? "Logging in..." : "Login"}
          loading={loading}
          onClick={handleSubmit}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl w-full transition shadow-md hover:shadow-lg"
        />

        <p className="text-center text-sm text-gray-500">
          Don’t have an account?{" "}
          <a href="/" className="text-orange-600 font-medium hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>

  );
}
