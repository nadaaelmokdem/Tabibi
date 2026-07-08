import React, { useEffect, useState } from "react";
import {
  FiCamera,
  FiUser,
  FiCalendar,
  FiPhone,
  FiBriefcase,
  FiHash,
  FiAlignLeft,
} from "react-icons/fi";
import { MdLocationOn, MdAssignment, MdVerified } from "react-icons/md";
import type { DoctorProfileData } from "../types/profilePageProps";
import { EditableDetailItem } from "../components/Profile/EditableDetail";
import { ServicesAndPricingManager } from "../components/Profile/ServicesAndPricingManager";
// Note: You might want to update this to DoctorService if you have separate services
import DoctorService from "../services/doctorService";

const ProfilePage: React.FC = () => {
  const [editingField, setEditingField] = useState<
    keyof DoctorProfileData | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);

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
    licenseProofUrl: "",
    idProofUrl: "",
    degreeProofUrl: "",
    specialties: [],
    isVerified: false,
    verificationStatus: "Pending",
    adminComment: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const [DoctorProfileData, specialtiesList] = await Promise.all([
          DoctorService.getProfile(),
          DoctorService.getSpecialties(),
        ]);

        setAvailableSpecialties(specialtiesList.map((s) => s.name));
        setProfile((prev) => ({
          ...prev,
          fullName: DoctorProfileData.fullName,
          email: DoctorProfileData.email,
          nationalIdNumber: DoctorProfileData.nationalIdNumber ?? "",
          licenseNumber: DoctorProfileData.licenseNumber ?? "",
          licenseExpiryDate: DoctorProfileData.licenseExpiryDate ?? "",
          yearsOfExperience: DoctorProfileData.yearsOfExperience !== null && DoctorProfileData.yearsOfExperience !== undefined ? DoctorProfileData.yearsOfExperience.toString() : "",
          clinicLocation: DoctorProfileData.clinicLocation ?? "",
          clinicPhoneNumber: DoctorProfileData.clinicPhoneNumber ?? "",
          bio: DoctorProfileData.bio ?? "",
          licenseProofUrl: DoctorProfileData.licenseProofUrl ?? "",
          idProofUrl: DoctorProfileData.idProofUrl ?? "",
          degreeProofUrl: DoctorProfileData.degreeProofUrl ?? "",
          specialties: Array.isArray(DoctorProfileData.specialties) ? DoctorProfileData.specialties : [],
          isVerified: DoctorProfileData.isVerified,
          verificationStatus: (DoctorProfileData.verificationStatus ?? "Pending") as DoctorProfileData["verificationStatus"],
          adminComment: DoctorProfileData.adminComment ?? "",
          
          clinicPrice: DoctorProfileData.clinicPrice, isClinicEnabled: DoctorProfileData.isClinicEnabled,
          
          chatPrice: DoctorProfileData.chatPrice, isChatEnabled: DoctorProfileData.isChatEnabled,
          
          videoPrice: DoctorProfileData.videoPrice, isVideoEnabled: DoctorProfileData.isVideoEnabled,
          
          callPrice: DoctorProfileData.callPrice, isCallEnabled: DoctorProfileData.isCallEnabled,
        }));
      } catch (error) {
        console.log("Error: " + error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleBulkSave = async (updatedProfile: DoctorProfileData) => {
    try {
      const payload = {
        ...updatedProfile,
        licenseExpiryDate: updatedProfile.licenseExpiryDate || null,
        yearsOfExperience: updatedProfile.yearsOfExperience ? parseInt(updatedProfile.yearsOfExperience) : null,
        specialties: updatedProfile.specialties.map(s => typeof s === 'string' ? s : s.name),
        // include prices (ts-ignore since we extended the type dynamically)
        
        clinicPrice: updatedProfile.clinicPrice, isClinicEnabled: updatedProfile.isClinicEnabled,
        
        chatPrice: updatedProfile.chatPrice, isChatEnabled: updatedProfile.isChatEnabled,
        
        videoPrice: updatedProfile.videoPrice, isVideoEnabled: updatedProfile.isVideoEnabled,
        
        callPrice: updatedProfile.callPrice, isCallEnabled: updatedProfile.isCallEnabled,
      };
      await DoctorService.bulkUpdateProfile(payload);
      setProfile(updatedProfile);
    } catch (error) {
      console.error("Failed to update profile:", error);
      throw error;
    }
  };

  const handleSave = async (
    field: keyof DoctorProfileData,
    value: any,
  ) => {
    try {
      if (value !== undefined) {
        if (field === "specialties") {
          await DoctorService.updateProfileField(field as string, JSON.stringify(value));
        } else {
          await DoctorService.updateProfileField(field as string, value);
        }
        setProfile((prev) => ({ ...prev, [field]: value }));
      }
    } catch (error) {
      console.error("Failed to update profile field:", error);
      // Optional: Add a toast notification here
      throw error;
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
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2A2455] whitespace-normal break-words max-w-full">
                {profile.fullName.startsWith("Dr.") ? profile.fullName : `Dr. ${profile.fullName}`}
                {profile.isVerified && (
                  <MdVerified className="inline-block text-blue-500 text-2xl ml-2 align-middle flex-shrink-0" title="Verified Doctor" />
                )}
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

        {/* Details Section */}
        <div className="p-4 sm:p-8 bg-[#FBFAFF]/50 sm:rounded-b-2xl space-y-8">
          
          {/* Section 1: Bio, Experience, Specialties & Pricing */}
          <div className="bg-white p-6 rounded-2xl border border-[#E6E1FF] shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-[#6A5ACD] flex items-center gap-2">
              <FiUser className="text-lg" /> Professional Overview
            </h2>
            
            {/* Bio takes full width */}
            <div className="w-full">
              <EditableDetailItem
                icon={<FiAlignLeft />}
                label="Professional Bio"
                value={profile.bio}
                isEditing={editingField === "bio"}
                onEdit={() => setEditingField("bio")}
                onSave={(val) => handleSave("bio", val)}
                onCancel={() => setEditingField(null)}
                type="textarea"
                fieldName="bio"
              />
            </div>

            {/* Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
            </div>
            
            <div className="border-t border-[#F4F1FF] pt-6">
              <ServicesAndPricingManager
                profile={profile}
                availableSpecialties={availableSpecialties}
                onSave={handleBulkSave}
              />
            </div>
          </div>

          {/* Section 2: Clinic & Contact Information */}
          <div className="bg-white p-6 rounded-2xl border border-[#E6E1FF] shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-[#6A5ACD] flex items-center gap-2">
              <MdLocationOn className="text-lg" /> Clinic & Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
            </div>
          </div>

          {/* Section 3: Paperwork & Verification Documents (At the Bottom) */}
          <div className="bg-[#FBFAFF] p-6 rounded-2xl border-2 border-dashed border-[#B8A7FF] shadow-sm">
            <h2 className="text-xl font-bold mb-1 text-[#6A5ACD] flex items-center gap-2">
              <MdAssignment className="text-lg" /> Verification Documents & Paperwork
            </h2>
            <p className="text-sm text-[#2A2455]/70 mb-5">
              Upload and verify your official credentials. Modifying any of these fields while approved will set your status to pending, but you can continue providing services at your pricing until reviewed.
            </p>
            {!profile.isVerified && (
              <div className={`border-l-4 p-4 rounded-md mb-6 shadow-sm ${
                profile.verificationStatus === "Rejected"
                  ? "bg-red-50 border-red-400"
                  : profile.verificationStatus === "NeedsChanges"
                    ? "bg-orange-50 border-orange-400"
                    : "bg-[#FFF8E1] border-[#FFC107]"
              }`}>
                <p className={`text-[14px] font-medium leading-relaxed ${
                  profile.verificationStatus === "Rejected"
                    ? "text-red-800"
                    : profile.verificationStatus === "NeedsChanges"
                      ? "text-orange-800"
                      : "text-[#856404]"
                }`}>
                  <strong>Notice:</strong>{" "}
                  {profile.verificationStatus === "Pending" &&
                    "Your profile is pending admin verification. You won't appear in patient search until approved."}
                  {profile.verificationStatus === "NeedsChanges" &&
                    (profile.adminComment || "The admin requested changes to your profile. Please update and resubmit.")}
                  {profile.verificationStatus === "Rejected" &&
                    (profile.adminComment || "Your application was rejected. Contact support for details.")}
                  {!profile.verificationStatus &&
                    "Your profile is currently unverified. Editing credentials will notify administration to re-review your profile."}
                </p>
              </div>
            )}
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
                icon={<FiHash />}
                label="ID Proof Link"
                value={profile.idProofUrl}
                isEditing={editingField === "idProofUrl"}
                onEdit={() => setEditingField("idProofUrl")}
                onSave={(val) => handleSave("idProofUrl", val)}
                onCancel={() => setEditingField(null)}
                type="text"
                fieldName="idProofUrl"
                allowUpload={true}
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
                icon={<MdAssignment />}
                label="License Proof Link (Drive, Dropbox, etc)"
                value={profile.licenseProofUrl}
                isEditing={editingField === "licenseProofUrl"}
                onEdit={() => setEditingField("licenseProofUrl")}
                onSave={(val) => handleSave("licenseProofUrl", val)}
                onCancel={() => setEditingField(null)}
                type="text"
                fieldName="licenseProofUrl"
                allowUpload={true}
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
                label="Medical Degree Proof Link"
                value={profile.degreeProofUrl}
                isEditing={editingField === "degreeProofUrl"}
                onEdit={() => setEditingField("degreeProofUrl")}
                onSave={(val) => handleSave("degreeProofUrl", val)}
                onCancel={() => setEditingField(null)}
                type="text"
                fieldName="degreeProofUrl"
                allowUpload={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
