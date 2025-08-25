
export async function registerUser(data: { name: string; email: string; password: string }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Registration failed");
  }

  return await res.json();
}

export async function loginUser(data: { email: string; password: string; }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Login failed");
  }

  return await res.json();
}

export async function searchUser(query: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/user/search?search=${query}`,
    {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message);
  }

  return await res.json();
}