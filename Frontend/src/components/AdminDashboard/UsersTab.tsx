import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import AdminService from "../../services/adminService";
import type { AdminUser } from "../../types/admin";

export default function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    AdminService.getAllUsers()
      .then(setUsers)
      .catch((err) => setError(err.message ?? "Failed to load users"))
      .finally(() => setLoading(false));
  }

  async function handleToggleActive(user: AdminUser) {
    const action = user.isActive ? "deactivate" : "reactivate";
    const result = await Swal.fire({
      title: `${action === "deactivate" ? "Deactivate" : "Reactivate"} ${user.fullName}?`,
      text:
        action === "deactivate"
          ? "They will no longer be able to log in. Their history is kept and this can be reversed."
          : "They will be able to log in again.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#6A5ACD",
      confirmButtonText: action === "deactivate" ? "Deactivate" : "Reactivate",
    });
    if (!result.isConfirmed) return;

    setActioningId(user.id);
    try {
      await AdminService.setUserActive(user.id, !user.isActive);
      load();
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setActioningId(null);
    }
  }

  if (loading) return <p className="text-[#2A2455]/60 text-sm">Loading users...</p>;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;

  return (
    <div className="bg-white border border-[#E6E1FF] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F7FF] text-left text-[#2A2455]/70">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 font-semibold">Total Spent</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F1FF]">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-[#2A2455]">{u.fullName}</td>
                <td className="px-4 py-3 text-[#2A2455]/70">{u.email}</td>
                <td className="px-4 py-3 text-[#2A2455]/70">{u.role}</td>
                <td className="px-4 py-3 text-[#2A2455]/70">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-[#2A2455]/70">
                  {u.totalSpent != null ? `$${u.totalSpent.toFixed(2)}` : "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      u.isActive
                        ? "bg-green-50 text-green-600"
                        : "bg-red-50 text-red-500"
                    }`}
                  >
                    {u.isActive ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    disabled={actioningId === u.id}
                    onClick={() => handleToggleActive(u)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                      u.isActive
                        ? "bg-red-50 text-red-500 hover:bg-red-100"
                        : "bg-[#6A5ACD] text-white hover:bg-[#5b4dc0]"
                    }`}
                  >
                    {u.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
