import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronRight, FaStar } from "react-icons/fa6";
import { MdVerified } from "react-icons/md";
import { CachedImage } from "../common/CachedImage";
import PublicService from "../../services/publicService";
import type { DoctorListItem } from "../../types/public";
import { getFileUrl } from "../../utils/fileUtils";

/**
 * Showcases a handful of real doctors from the platform on the homepage.
 */
export default function DoctorsPreviewSection() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    PublicService.getDoctors({ page: 1, pageSize: 3 })
      .then((res) => {
        if (active) setDoctors(res.items);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!loading && doctors.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-light">
          Available doctors
        </p>
        <button
          type="button"
          onClick={() => navigate("/doctors")}
          className="cursor-pointer flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors duration-150"
        >
          Browse all <FaChevronRight size={11} />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-primary/10 animate-pulse">
                <div className="h-44 bg-surface-variant/60" />
                <div className="p-4 pt-2.5 space-y-2">
                  <div className="h-4 w-2/3 bg-surface-variant/60 rounded" />
                  <div className="h-3 w-1/2 bg-surface-variant/40 rounded" />
                </div>
              </div>
            ))
          : doctors.map((doc) => (
              <div
                key={doc.doctorId}
                onClick={() => navigate(`/doctors/${doc.doctorId}`)}
                className="group rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer bg-white border border-primary/10 shadow-sm hover:-translate-y-0.5 hover:shadow-xl hover:border-primary/25"
              >
                <div className="relative h-44 bg-surface-variant overflow-hidden">
                  {doc.profilePictureUrl ? (
                    <CachedImage
                      src={getFileUrl(doc.profilePictureUrl)}
                      alt={doc.fullName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary bg-gradient-to-br from-primary/20 to-primary/5">
                      {doc.fullName.replace(/^Dr\.\s*/i, "").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/85" style={{ backgroundImage: "linear-gradient(to bottom, transparent 55%, rgba(255,255,255,0.85) 100%)" }} />
                  {doc.isVerified && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-white/92 text-primary shadow-sm">
                      <MdVerified size={12} />
                      Verified
                    </div>
                  )}
                </div>
                <div className="p-4 pt-2.5">
                  <p className="text-sm font-bold mb-0.5 text-primary-dark tracking-tight">
                    Dr. {doc.fullName}
                  </p>
                  <p className="text-xs mb-2.5 text-text-muted">
                    {doc.specialties[0]?.name ?? "General Practice"}
                    {doc.yearsOfExperience != null ? ` · ${doc.yearsOfExperience} yrs exp.` : ""}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, j) => (
                        <FaStar key={j} size={10} className={j < Math.round(doc.averageRating) ? "text-primary" : "text-surface-variant"} />
                      ))}
                      <span className="text-xs font-bold ml-1 text-primary-dark">{doc.averageRating.toFixed(1)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/doctors/${doc.doctorId}`);
                      }}
                      className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors duration-200"
                    >
                      Book now
                    </button>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}
