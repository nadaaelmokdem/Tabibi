import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import AdminService from "../../services/adminService";
import type { AdminUser } from "../../types/admin";
import { formatMoney } from "../../utils/formatMoney";
import Skeleton from "../common/Skeleton";
import NetworkError from "../common/NetworkError";

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
      text: action === "deactivate"
        ? "They will no longer be able to log in. Their history is kept and this can be reversed."
        : "They will be able to log in again.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: action === "deactivate" ? "Deactivate" : "Reactivate",
      cancelButtonText: 'Cancel',
      buttonsStyling: false,
      customClass: {
        popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-gray-100',
        title: 'text-xl font-bold mb-2 text-gray-800',
        htmlContainer: 'text-gray-600 mb-6 m-0',
        confirmButton: `w-full ${action === "deactivate" ? "bg-red-500 hover:bg-red-600" : "bg-[#6A5ACD] hover:bg-[#5b4dc0]"} text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer`,
        cancelButton: 'w-full mt-3 py-3 text-gray-500 font-semibold hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer',
        actions: 'flex flex-col w-full m-0'
      }
    });
    if (!result.isConfirmed) return;

    setActioningId(user.id);
    try {
      await AdminService.setUserActive(user.id, !user.isActive);
      load();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err instanceof Error ? err.message : "Action failed",
        buttonsStyling: false,
        customClass: {
          popup: 'bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full border border-gray-100',
          title: 'text-2xl font-bold mb-2 text-gray-800',
          htmlContainer: 'text-gray-600 mb-6 m-0',
          confirmButton: 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer',
        }
      });
    } finally {
      setActioningId(null);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <NetworkError message={error} />;

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
                  {u.totalSpent != null ? formatMoney(u.totalSpent) : "-"}
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
