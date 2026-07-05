import React, { useEffect, useState } from "react";
import {
  FiCamera,
  FiUser,
  FiCalendar,
  FiPhone,
  FiBriefcase,
  FiHash,
  FiAlignLeft,
  FiStar,
} from "react-icons/fi";
import { MdLocationOn, MdAssignment } from "react-icons/md";
import type { DoctorProfileData } from "../types/profilePageProps";
import { EditableDetailItem } from "../components/Profile/EditableDetail";
// Note: You might want to update this to DoctorService if you have separate services
import DoctorService from "../services/doctorService";

const ProfilePage: React.FC = () => {
  const [editingField, setEditingField] = useState<
    keyof DoctorProfileData | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  // Updated to reflect the doctor form fields
  const [profile, setProfile] = useState<DoctorProfileData>({
    fullName: "",
    email: "",
    imageUrl: "",
    nationalIdNumber: "",
    licenseNumber: "",
    licenseExpiryDate: "",
    yearsOfExperience: "",
    clinicLocation: "",
    clinicPhoneNumber: "",
    bio: "",
    specialties: "", // Stored as a comma-separated string for easy editing in EditableDetailItem
    verificationStatus: "Pending",
    adminComment: undefined,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const DoctorProfileData = await DoctorService.getProfile();

        setProfile((prev) => ({
          ...prev,
          fullName: DoctorProfileData.fullName,
          email: DoctorProfileData.email,
          nationalIdNumber: DoctorProfileData.nationalIdNumber,
          licenseNumber: DoctorProfileData.licenseNumber,
          licenseExpiryDate: DoctorProfileData.licenseExpiryDate,
          yearsOfExperience: DoctorProfileData.yearsOfExperience,
          clinicLocation: DoctorProfileData.clinicLocation,
          clinicPhoneNumber: DoctorProfileData.clinicPhoneNumber,
          bio: DoctorProfileData.bio,
          // Convert array to comma-separated string if the API returns an array
          specialties: Array.isArray(DoctorProfileData.specialties)
            ? DoctorProfileData.specialties.join(", ")
            : DoctorProfileData.specialties,
          verificationStatus: DoctorProfileData.verificationStatus,
          adminComment: DoctorProfileData.adminComment,
        }));
      } catch (error) {
        console.log("Error: " + error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (
    field: keyof DoctorProfileData,
    value: string | undefined,
  ) => {
    try {
      if (value !== undefined) {
        await DoctorService.updateProfileField(field as string, value);
        setProfile((prev) => ({
          ...prev,
          [field]: value,
          // Mirrors the backend: editing a rejected/changes-requested profile
          // counts as a resubmission and sends it back to Pending.
          verificationStatus:
            prev.verificationStatus === "Rejected" || prev.verificationStatus === "NeedsChanges"
              ? "Pending"
              : prev.verificationStatus,
        }));
      }
    } catch (error) {
      console.error("Failed to update profile field:", error);
      // Optional: Add a toast notification here
    } finally {
      setEditingField(null);
    }
  };

  const handleImageClick = () => {
    alert("Image upload trigger goes here.");
  };

  if (isLoading) {
    return (
      <div className="bg-[#FBFAFF] pt-10 px-4 sm:px-6 lg:px-15 flex justify-center items-start font-sans text-[#2A2455]">
        <div className="w-full h-fit flex flex-col bg-white sm:rounded-2xl shadow-xl sm:border border-[#E6E1FF]">
          {/* Header Skeleton */}
          <div className="p-4 sm:p-6 border-b border-[#E6E1FF] bg-white flex flex-col items-center sm:flex-row sm:items-center gap-4 sm:gap-6 sm:rounded-t-2xl">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#E6E1FF] animate-pulse"></div>
            <div className="flex-1 w-full space-y-2">
              <div className="h-8 bg-[#E6E1FF] rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-[#E6E1FF] rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
          {/* Grid Skeleton */}
          <div className="p-4 sm:p-8 bg-[#FBFAFF]/50 sm:rounded-b-2xl">
            <div className="h-6 bg-[#E6E1FF] rounded w-1/4 mb-6 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-[#E6E1FF] rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FBFAFF] pt-10 px-4 sm:px-6 lg:px-15 flex justify-center items-start font-sans text-[#2A2455]">
      <div className="w-full h-fit flex flex-col bg-white sm:rounded-2xl shadow-xl sm:border border-[#E6E1FF]">
        {/* Header Section */}
        <div className="p-4 sm:p-6 border-b border-[#E6E1FF] bg-white flex flex-col items-center sm:flex-row sm:items-center gap-4 sm:gap-6 sm:rounded-t-2xl">
          {/* Avatar Container */}
          <div
            className="relative cursor-pointer flex-shrink-0"
            onClick={handleImageClick}
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-[#E6E1FF] bg-[#FBFAFF] flex items-center justify-center">
              {profile.imageUrl ? (
                <img
                  src={profile.imageUrl}
                  alt={profile.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FiUser className="text-[#B8A7FF] text-4xl" />
              )}
            </div>
            {/* Camera icon overlay */}
            <div className="absolute bottom-0 right-0 bg-[#6A5ACD] p-1.5 rounded-full border-2 border-white shadow-sm hover:bg-[#2A2455] transition-colors">
              <FiCamera className="text-white text-sm" />
            </div>
          </div>

          {/* Name & Handle */}
          <div className="flex-1 text-center sm:text-left flex flex-col justify-center w-full">
            <div className="flex items-center gap-3 justify-center sm:justify-start w-full">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2A2455] truncate max-w-full">
                {profile.fullName}
              </h1>
            </div>
            <div className="mt-0.5">
              <div className="flex items-center gap-3 justify-center sm:justify-start w-full">
                <h1 className="text-lg sm:text-xl font-medium text-[#2A2455] truncate max-w-full">
                  {profile.email}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid Section */}
        <div className="p-4 sm:p-8 bg-[#FBFAFF]/50 sm:rounded-b-2xl">
          {(profile.verificationStatus === "Rejected" ||
            profile.verificationStatus === "NeedsChanges") && (
            <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
              <p className="font-bold mb-1">
                {profile.verificationStatus === "Rejected"
                  ? "Your application was rejected"
                  : "Changes requested by admin"}
              </p>
              {profile.adminComment && <p>{profile.adminComment}</p>}
              <p className="mt-1 text-orange-600/80">
                Edit the relevant field below and it will automatically be resubmitted for review.
              </p>
            </div>
          )}
          {profile.verificationStatus === "Pending" && (
            <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
              Your profile is awaiting admin verification.
            </div>
          )}
          {profile.verificationStatus === "Approved" && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              Your profile is verified.
            </div>
          )}

          <h2 className="text-xl font-bold mb-4 text-[#6A5ACD] px-2 sm:px-0">
            Professional Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <EditableDetailItem
              icon={<FiHash />}
              label="National ID Number"
              value={profile.nationalIdNumber}
              isEditing={editingField === "nationalIdNumber"}
              onEdit={() => setEditingField("nationalIdNumber")}
              onSave={(val) => handleSave("nationalIdNumber", val)}
              onCancel={() => setEditingField(null)}
              type="text"
              fieldName="nationalIdNumber"
            />

            <EditableDetailItem
              icon={<MdAssignment />}
              label="Medical License Number"
              value={profile.licenseNumber}
              isEditing={editingField === "licenseNumber"}
              onEdit={() => setEditingField("licenseNumber")}
              onSave={(val) => handleSave("licenseNumber", val)}
              onCancel={() => setEditingField(null)}
              type="text"
              fieldName="licenseNumber"
            />

            <EditableDetailItem
              icon={<FiCalendar />}
              label="License Expiry Date"
              value={profile.licenseExpiryDate}
              isEditing={editingField === "licenseExpiryDate"}
              onEdit={() => setEditingField("licenseExpiryDate")}
              onSave={(val) => handleSave("licenseExpiryDate", val)}
              onCancel={() => setEditingField(null)}
              type="date"
              fieldName="licenseExpiryDate"
            />

            <EditableDetailItem
              icon={<FiBriefcase />}
              label="Years of Experience"
              value={profile.yearsOfExperience}
              isEditing={editingField === "yearsOfExperience"}
              onEdit={() => setEditingField("yearsOfExperience")}
              onSave={(val) => handleSave("yearsOfExperience", val)}
              onCancel={() => setEditingField(null)}
              type="number"
              fieldName="yearsOfExperience"
            />

            <EditableDetailItem
              icon={<MdLocationOn />}
              label="Clinic Location"
              value={profile.clinicLocation}
              isEditing={editingField === "clinicLocation"}
              onEdit={() => setEditingField("clinicLocation")}
              onSave={(val) => handleSave("clinicLocation", val)}
              onCancel={() => setEditingField(null)}
              type="text"
              fieldName="clinicLocation"
            />

            <EditableDetailItem
              icon={<FiPhone />}
              label="Clinic Phone Number"
              value={profile.clinicPhoneNumber}
              isEditing={editingField === "clinicPhoneNumber"}
              onEdit={() => setEditingField("clinicPhoneNumber")}
              onSave={(val) => handleSave("clinicPhoneNumber", val)}
              onCancel={() => setEditingField(null)}
              type="tel"
              fieldName="clinicPhoneNumber"
            />

            <EditableDetailItem
              icon={<FiStar />}
              label="Specialties"
              value={profile.specialties}
              isEditing={editingField === "specialties"}
              onEdit={() => setEditingField("specialties")}
              onSave={(val) => handleSave("specialties", val)}
              onCancel={() => setEditingField(null)}
              type="tags"
              fieldName="specialties"
            />

            <EditableDetailItem
              icon={<FiAlignLeft />}
              label="Professional Bio"
              value={profile.bio}
              isEditing={editingField === "bio"}
              onEdit={() => setEditingField("bio")}
              onSave={(val) => handleSave("bio", val)}
              onCancel={() => setEditingField(null)}
              type="text"
              fieldName="bio"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
