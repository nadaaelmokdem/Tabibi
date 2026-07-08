import { useEffect, useState } from "react";
import AdminService from "../../services/adminService";
import type { AdminAppointment } from "../../types/admin";

export default function AppointmentsTab() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AdminService.getAppointments()
      .then(setAppointments)
      .catch((err) => setError(err.message ?? "Failed to load appointments"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[#2A2455]/60 text-sm">Loading appointments...</p>;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;

  return (
    <div className="bg-white border border-[#E6E1FF] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F7FF] text-left text-[#2A2455]/70">
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Doctor</th>
              <th className="px-4 py-3 font-semibold">Scheduled</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F1FF]">
            {appointments.map((a) => (
              <tr key={a.appointmentId}>
                <td className="px-4 py-3 font-medium text-[#2A2455]">{a.patientName}</td>
                <td className="px-4 py-3 text-[#2A2455]/70">{a.doctorName}</td>
                <td className="px-4 py-3 text-[#2A2455]/70">
                  {new Date(a.scheduledAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-[#2A2455]/70">{a.consultationType}</td>
                <td className="px-4 py-3 text-[#2A2455]/70">{a.status}</td>
                <td className="px-4 py-3 text-[#2A2455]/70">${a.price.toFixed(2)}</td>
                <td className="px-4 py-3 text-[#2A2455]/70">
                  {a.paymentStatus ?? "No payment"}
                  {a.amountPaid != null && ` ($${a.amountPaid.toFixed(2)})`}
                </td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No appointments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
