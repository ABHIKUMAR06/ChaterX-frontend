import { GroupModelProps, User } from "@/type/type";
import { useState, useEffect } from "react";
import { searchUser } from "@/lib/userApi";


export function GroupModel({ onClose, onCreate }: GroupModelProps) {
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const data = await searchUser(searchQuery);
        const filteredResults = data.users.filter(
          (user: User) => !selectedUsers.some(selected => selected._id === user._id)
        );
        setSearchResults(filteredResults);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedUsers]);

  const handleUserSelect = (user: User) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleUserRemove = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user._id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    if (selectedUsers.length === 0) {
      alert("Please select at least one user for the group");
      return;
    }

    setLoading(true);
    try {
      await onCreate({
        name: groupName,
        users: selectedUsers.map(user => user._id)
      });
      onClose();
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-orange-600">Create Group</h2>

        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group Name"
          className="w-full px-4 py-2 bg-gray-50 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full px-4 py-2 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />

          {searchLoading && (
            <div className="mt-2 text-sm text-gray-500">Searching...</div>
          )}

          {searchResults.length > 0 && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg max-h-32 overflow-y-auto shadow-sm">
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  className="p-2 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="font-medium text-gray-800">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedUsers.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-gray-700">
              Selected Users ({selectedUsers.length})
            </h3>
            <div className="space-y-2">
              {selectedUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-200"
                >
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                  <button
                    onClick={() => handleUserRemove(user._id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            onClick={handleCreateGroup}
            disabled={loading || !groupName.trim() || selectedUsers.length === 0}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

  );
}