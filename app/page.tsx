"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/userApi";
import Button from "@/components/Button/button";

interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      router.push("/dashboard")
    }
  }, [])
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    setError("");
    setLoading(true);

    try {
      await registerUser(form);
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-orange-50 to-orange-100">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md space-y-6">
        <h2 className="text-4xl font-extrabold text-gray-800 text-center">Create Account</h2>

        {error && (
          <p className="text-red-500 text-center text-sm font-medium animate-pulse">{error}</p>
        )}

        <div className="flex flex-col gap-5">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition shadow-sm hover:shadow-md"
            required
          />

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
          value={loading ? "Registering..." : "Register"}
          loading={loading}
          onClick={handleRegister}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl w-full transition shadow-md hover:shadow-lg"
        />

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-orange-600 font-medium hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>

  );
}
