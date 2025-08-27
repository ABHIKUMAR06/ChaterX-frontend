"use client";

import { useState, useEffect } from "react";
import { searchUser } from "@/lib/userApi";
import { User, UserSearchProps } from "@/type/type";

interface ModifiedUserSearchProps extends Omit<UserSearchProps, "socket" | "onChatCreated"> {
  onUserClick: (user: User) => void;
}

export default function UserSearch({ onUserClick }: ModifiedUserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return setResults([]);

    const delayDebounce = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await searchUser(query);
        setResults(data.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <div className="relative w-full max-w-md mx-auto my-2">
      <input
        type="text"
        placeholder="Search users..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-3 rounded-xl shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-400 transition placeholder-gray-400 bg-white"
      />

      {loading && (
        <div className="absolute z-50 mt-2 w-full rounded-xl bg-white shadow-xl p-3 text-sm text-gray-500">
          Searching...
        </div>
      )}

      {query && !loading && results.length > 0 && (
        <ul className="absolute z-50 mt-2 w-full rounded-xl bg-white shadow-xl max-h-64 overflow-y-auto">
          {results.map((user) => (
            <li
              key={user._id}
              className="px-4 py-3 hover:bg-orange-50 cursor-pointer transition flex flex-col"
              onClick={() => {
                onUserClick(user);
                setQuery(""); 
                setResults([]);
              }}
            >
              <p className="font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </li>
          ))}
        </ul>
      )}

      {query && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl bg-white shadow-xl p-3 text-sm text-gray-500 text-center">
          No users found
        </div>
      )}
    </div>
  );
}
