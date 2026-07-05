import { MdLocationOn, MdAssignment, MdAdd, MdDelete } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
// import DoctorService from '../services/doctorService';
import { AxiosError } from "axios";
import type DoctorFormData from "../types/doctorRegisterForm";
import ErrorBanner from "../components/Auth/ErrorBanner";

export default function DoctorAdditionalData() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Input selection states for URL vs File uploads
  const [licenseProofType, setLicenseProofType] = useState<"file" | "link">(
    "file",
  );
  const [profilePicType, setProfilePicType] = useState<"file" | "link">("file");

  // File states
  const [licenseProofFile, setLicenseProofFile] = useState<File | null>(null);
  const [licenseProofUrl, setLicenseProofUrl] = useState<string>("");
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string>("");

  // Main Form Fields
  const [formData, setFormData] = useState<DoctorFormData>({
    id: user?.id || "",
    licenseNumber: "",
    nationalIdNumber: "",
    clinicLocation: "",
    clinicPhoneNumber: "",
    licenseExpiryDate: "",
    yearsOfExperience: "",
    bio: "",
    specialties: [""], // Starts with one empty specialty input
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.licenseNumber.trim())
      newErrors.licenseNumber = "License number is required.";
    if (!formData.nationalIdNumber.trim())
      newErrors.nationalIdNumber = "National ID is required.";
    if (!formData.licenseExpiryDate)
      newErrors.licenseExpiryDate = "Expiry date is required.";

    if (
      !formData.yearsOfExperience ||
      isNaN(Number(formData.yearsOfExperience)) ||
      Number(formData.yearsOfExperience) < 0
    ) {
      newErrors.yearsOfExperience = "Enter a valid number of years.";
    }

    // License Proof Validation
    if (licenseProofType === "file" && !licenseProofFile) {
      newErrors.licenseProof = "Please upload a file proof of your license.";
    } else if (licenseProofType === "link" && !licenseProofUrl.trim()) {
      newErrors.licenseProof = "Please provide a valid URL link.";
    }

    // Specialties Validation
    formData.specialties.forEach((spec, index) => {
      if (!spec.trim()) {
        newErrors[`specialty_${index}`] = "Specialty name is required.";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Dynamic Specialties Handlers
  const handleSpecialtyChange = (index: number, value: string) => {
    const updatedSpecialties = [...formData.specialties];
    updatedSpecialties[index] = value;
    setFormData({ ...formData, specialties: updatedSpecialties });

    if (errors[`specialty_${index}`]) {
      setErrors((prev) => ({ ...prev, [`specialty_${index}`]: "" }));
    }
  };

  const addSpecialtyField = () => {
    setFormData({
      ...formData,
      specialties: [...formData.specialties, ""],
    });
  };

  const removeSpecialtyField = (index: number) => {
    if (formData.specialties.length === 1) return;
    const updatedSpecialties = formData.specialties.filter(
      (_, i) => i !== index,
    );
    setFormData({ ...formData, specialties: updatedSpecialties });
  };

  const handleSaveAndContinue = async () => {
    setGlobalError("");
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      const submissionData = new FormData();
      submissionData.append("id", formData.id);
      submissionData.append("licenseNumber", formData.licenseNumber);
      submissionData.append("nationalIdNumber", formData.nationalIdNumber);
      submissionData.append("licenseExpiryDate", formData.licenseExpiryDate);
      submissionData.append("yearsOfExperience", formData.yearsOfExperience);
      submissionData.append("clinicLocation", formData.clinicLocation);
      submissionData.append("clinicPhoneNumber", formData.clinicPhoneNumber);
      submissionData.append("bio", formData.bio);
      submissionData.append(
        "specialties",
        JSON.stringify(formData.specialties),
      );

      if (licenseProofType === "file" && licenseProofFile) {
        submissionData.append("licenseProofFile", licenseProofFile);
      } else {
        submissionData.append("licenseProofUrl", licenseProofUrl);
      }

      if (profilePicType === "file" && profilePicFile) {
        submissionData.append("profilePictureFile", profilePicFile);
      } else if (profilePicType === "link" && profilePicUrl) {
        submissionData.append("profilePictureUrl", profilePicUrl);
      }

      // await DoctorService.updateDoctorData(submissionData);
      setIsLoading(false);
      navigate("/");
    } catch (error) {
      if (
        error instanceof AxiosError &&
        error.response &&
        error.response.data
      ) {
        const errorData = error.response.data;
        if (Array.isArray(errorData) && errorData.length > 0) {
          let hasMappedError = false;
          const backendErrors: Record<string, string> = {};
          
          errorData.forEach((errItem: any) => {
             const desc = errItem.description || "";
             const descLower = desc.toLowerCase();
             if (descLower.includes("national id")) { backendErrors.nationalIdNumber = desc; hasMappedError = true; }
             else if (descLower.includes("license number")) { backendErrors.licenseNumber = desc; hasMappedError = true; }
             else if (descLower.includes("expiry")) { backendErrors.licenseExpiryDate = desc; hasMappedError = true; }
             else if (descLower.includes("experience")) { backendErrors.yearsOfExperience = desc; hasMappedError = true; }
             else if (descLower.includes("license proof")) { backendErrors.licenseProof = desc; hasMappedError = true; }
          });
          
          if (hasMappedError) {
             setErrors(prev => ({ ...prev, ...backendErrors }));
          } else {
             setGlobalError(errorData[0].description);
          }
        } else if (typeof errorData === "string") {
          setGlobalError(errorData);
        }
      } else if (error instanceof AxiosError) {
        setGlobalError(error.message);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#fcf8ff] text-[#1a1345] text-[15px] lg:text-[16px] leading-[24px] font-normal antialiased h-screen max-h-screen overflow-hidden flex flex-col selection:bg-[#6a5acd] selection:text-[#f0ebff]">
      <main className="flex-grow flex w-full h-full relative overflow-hidden">
        {/* Background Image Layer */}
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
          <img
            alt="Tabibi Medical Group"
            className="w-full h-full object-cover object-left"
            src="user-login.jpg"
          />
        </div>

        {/* Ambient Gradient Masks */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-0"></div>
          <div className="absolute inset-y-0 right-0 w-[60%] bg-gradient-to-t to-transparent backdrop-blur-sm"></div>
        </div>

        <div className="relative w-full h-full flex flex-col lg:flex-row z-20 max-lg:backdrop-blur-sm overflow-hidden">
          {/* Left Side Branding Block */}
          <div className="hidden lg:flex flex-col justify-end w-[35%] p-8 lg:p-12 pb-16 lg:pb-22">
            <div className="max-w-md">
              <h2 className="text-[32px] lg:text-[38px] leading-[38px] lg:leading-[46px] tracking-[-0.01em] font-bold mb-3 text-white drop-shadow-md">
                Empowering your practice.
              </h2>
              <p className="text-[15px] lg:text-[17px] leading-[23px] lg:leading-[27px] font-normal text-white/90 drop-shadow-sm">
                Join Tabibi Medical Group to manage schedules, view histories,
                and seamlessly deliver precision care.
              </p>
            </div>
          </div>

          {/* Right Side: Form Container */}
          <div className="w-full lg:w-[65%] h-full flex items-center justify-center p-4 lg:p-8 ml-auto overflow-hidden">
            <div className="w-full max-w-2xl flex flex-col gap-4 lg:gap-5 bg-white/95 backdrop-blur-md p-6 lg:p-10 rounded-3xl shadow-2xl border border-white/20 max-h-[96vh] overflow-y-auto">
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-1.5">
                <h1 className="text-[24px] lg:text-[28px] leading-[30px] lg:leading-[36px] font-bold text-[#1a1345]">
                  Welcome, Dr. {user?.fullName}!
                </h1>
                <p className="text-[14px] leading-[20px] text-[#474553]">
                  Please fulfill your credential application below to finalize
                  verification processes on our network.
                </p>
              </div>

              <form
                className="space-y-5"
                noValidate
                onSubmit={(e) => e.preventDefault()}
              >
                {globalError && <ErrorBanner message={globalError} />}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* National ID */}
                  <div>
                    <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1.5">
                      National ID Number
                    </label>
                    <input
                      name="nationalIdNumber"
                      value={formData.nationalIdNumber}
                      onChange={handleInputChange}
                      className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
                        errors.nationalIdNumber
                          ? "border-red-400 focus:border-red-500"
                          : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3]"
                      }`}
                      placeholder="2990101XXXXXXX"
                      type="text"
                      disabled={isLoading}
                    />
                    {errors.nationalIdNumber && (
                      <p className="text-red-500 text-[12px] mt-1 font-medium">
                        {errors.nationalIdNumber}
                      </p>
                    )}
                  </div>

                  {/* License Number */}
                  <div>
                    <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1.5">
                      Medical License Number
                    </label>
                    <input
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
                        errors.licenseNumber
                          ? "border-red-400 focus:border-red-500"
                          : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3]"
                      }`}
                      placeholder="LIC-12345678"
                      type="text"
                      disabled={isLoading}
                    />
                    {errors.licenseNumber && (
                      <p className="text-red-500 text-[12px] mt-1 font-medium">
                        {errors.licenseNumber}
                      </p>
                    )}
                  </div>

                  {/* License Expiry Date */}
                  <div>
                    <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1.5">
                      License Expiry Date
                    </label>
                    <input
                      name="licenseExpiryDate"
                      value={formData.licenseExpiryDate}
                      onChange={handleInputChange}
                      className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
                        errors.licenseExpiryDate
                          ? "border-red-400 focus:border-red-500"
                          : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3]"
                      }`}
                      type="date"
                      disabled={isLoading}
                    />
                    {errors.licenseExpiryDate && (
                      <p className="text-red-500 text-[12px] mt-1 font-medium">
                        {errors.licenseExpiryDate}
                      </p>
                    )}
                  </div>

                  {/* Years of Experience */}
                  <div>
                    <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1.5">
                      Years of Experience
                    </label>
                    <input
                      name="yearsOfExperience"
                      value={formData.yearsOfExperience}
                      onChange={handleInputChange}
                      className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
                        errors.yearsOfExperience
                          ? "border-red-400 focus:border-red-500"
                          : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3]"
                      }`}
                      placeholder="e.g. 8"
                      type="number"
                      min="0"
                      disabled={isLoading}
                    />
                    {errors.yearsOfExperience && (
                      <p className="text-red-500 text-[12px] mt-1 font-medium">
                        {errors.yearsOfExperience}
                      </p>
                    )}
                  </div>

                  {/* Professional Bio Statement */}
                  <div className="md:col-span-2">
                    <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1.5">
                      Professional Bio (Optional)
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full p-3 bg-white border border-[#e5deff] rounded-lg text-[14px] lg:text-[15px] outline-none transition-all focus:ring-1 focus:ring-[#5140b3] resize-none"
                      placeholder="Brief description about your clinical focus, background, and achievements..."
                      disabled={isLoading}
                    />
                  </div>

                  {/* Profile Picture */}
                  <div className="md:col-span-2 p-4 bg-[#f8f9fa] rounded-xl border border-[#e5deff]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                      <label className="text-[13px] lg:text-[14px] font-semibold text-[#1a1345]">
                        Profile Picture (Optional)
                      </label>
                      <div className="flex gap-1 bg-white border p-0.5 rounded-md text-[12px]">
                        <button
                          type="button"
                          onClick={() => setProfilePicType("file")}
                          className={`px-2 py-1 rounded ${profilePicType === "file" ? "bg-[#5140b3] text-white font-medium" : "text-gray-500"}`}
                        >
                          File Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfilePicType("link")}
                          className={`px-2 py-1 rounded ${profilePicType === "link" ? "bg-[#5140b3] text-white font-medium" : "text-gray-500"}`}
                        >
                          Web Link
                        </button>
                      </div>
                    </div>
                    {profilePicType === "file" ? (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setProfilePicFile(e.target.files?.[0] || null)
                        }
                        className="w-full text-[13px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[13px] file:font-semibold file:bg-[#f0ebff] file:text-[#5140b3] hover:file:bg-[#e5deff]"
                        disabled={isLoading}
                      />
                    ) : (
                      <input
                        type="url"
                        value={profilePicUrl}
                        onChange={(e) => setProfilePicUrl(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="w-full h-10 px-3 bg-white border border-[#e5deff] rounded-lg text-[13px] outline-none"
                        disabled={isLoading}
                      />
                    )}
                  </div>

                  {/* License Proof Document */}
                  <div className="md:col-span-2 p-4 bg-[#f8f9fa] rounded-xl border border-[#e5deff]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                      <label className="text-[13px] lg:text-[14px] font-semibold text-[#1a1345]">
                        License Document Verification Proof
                      </label>
                      <div className="flex gap-1 bg-white border p-0.5 rounded-md text-[12px]">
                        <button
                          type="button"
                          onClick={() => setLicenseProofType("file")}
                          className={`px-2 py-1 rounded ${licenseProofType === "file" ? "bg-[#5140b3] text-white font-medium" : "text-gray-500"}`}
                        >
                          File Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setLicenseProofType("link")}
                          className={`px-2 py-1 rounded ${licenseProofType === "link" ? "bg-[#5140b3] text-white font-medium" : "text-gray-500"}`}
                        >
                          Web Link
                        </button>
                      </div>
                    </div>
                    {licenseProofType === "file" ? (
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) =>
                          setLicenseProofFile(e.target.files?.[0] || null)
                        }
                        className="w-full text-[13px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[13px] file:font-semibold file:bg-[#f0ebff] file:text-[#5140b3] hover:file:bg-[#e5deff]"
                        disabled={isLoading}
                      />
                    ) : (
                      <input
                        type="url"
                        value={licenseProofUrl}
                        onChange={(e) => setLicenseProofUrl(e.target.value)}
                        placeholder="https://example.com/license-proof.pdf"
                        className="w-full h-10 px-3 bg-white border border-[#e5deff] rounded-lg text-[13px] outline-none"
                        disabled={isLoading}
                      />
                    )}
                    {errors.licenseProof && (
                      <p className="text-red-500 text-[12px] mt-1 font-medium">
                        {errors.licenseProof}
                      </p>
                    )}
                  </div>

                  {/* Clinic Meta Information (Optional) */}
                  <div className="md:col-span-2 p-4 bg-[#fbfaff] rounded-xl border border-[#e5deff] space-y-4">
                    <h3 className="text-[13px] lg:text-[14px] font-semibold text-[#1a1345] flex items-center gap-2">
                      <MdLocationOn className="text-xl text-[#5140b3]" />
                      Clinic Location Details (Optional)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-[#474553] mb-1">
                          Physical Clinic Address
                        </label>
                        <input
                          name="clinicLocation"
                          value={formData.clinicLocation}
                          onChange={handleInputChange}
                          className="w-full h-10 px-3 bg-white border border-[#e5deff] rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-[#5140b3]"
                          placeholder="Building 4, Medical Square"
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#474553] mb-1">
                          Clinic Desk Line
                        </label>
                        <input
                          name="clinicPhoneNumber"
                          value={formData.clinicPhoneNumber}
                          onChange={handleInputChange}
                          className="w-full h-10 px-3 bg-white border border-[#e5deff] rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-[#5140b3]"
                          placeholder="+202XXXXXXXX"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Specialties Array Injection (Pricing Elements Removed) */}
                  <div className="md:col-span-2 p-4 bg-[#f6f1ff]/60 rounded-xl border border-[#e5deff] space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[13px] lg:text-[14px] font-semibold text-[#1a1345] flex items-center gap-2">
                        <MdAssignment className="text-xl text-[#5140b3]" />
                        Offered Specialties
                      </h3>
                      <button
                        type="button"
                        onClick={addSpecialtyField}
                        className="flex items-center gap-1 text-[12px] bg-[#5140b3] text-white font-semibold py-1 px-2.5 rounded-md hover:bg-[#6a5acd] transition-all"
                        disabled={isLoading}
                      >
                        <MdAdd /> Add Specialty
                      </button>
                    </div>

                    {formData.specialties.map((spec, index) => (
                      <div
                        key={index}
                        className="flex gap-3 items-center bg-white border border-[#e5deff] p-3 rounded-lg relative"
                      >
                        <div className="flex-grow">
                          <input
                            type="text"
                            value={spec}
                            onChange={(e) =>
                              handleSpecialtyChange(index, e.target.value)
                            }
                            placeholder="e.g. Cardiology"
                            className={`w-full h-10 px-3 bg-white border rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-[#5140b3] ${
                              errors[`specialty_${index}`]
                                ? "border-red-400 focus:border-red-500"
                                : "border-[#e5deff]"
                            }`}
                            disabled={isLoading}
                          />
                          {errors[`specialty_${index}`] && (
                            <p className="text-red-500 text-[11px] mt-1 font-medium">
                              {errors[`specialty_${index}`]}
                            </p>
                          )}
                        </div>

                        {formData.specialties.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSpecialtyField(index)}
                            className="text-red-400 hover:text-red-600 p-1.5 rounded-lg transition-colors"
                            disabled={isLoading}
                          >
                            <MdDelete className="text-xl" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Operations Layer */}
                <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
                  <button
                    type="button"
                    className={`flex-1 h-11.5 flex items-center justify-center bg-[#6a5acd] text-[#f0ebff] hover:bg-[#5140b3] hover:text-white rounded-full text-[14px] font-semibold transition-all shadow-md active:scale-[0.98] ${
                      isLoading
                        ? "opacity-70 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    onClick={handleSaveAndContinue}
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "Submit Profile Data"}
                  </button>
                  <button
                    onClick={() => navigate("/")}
                    className="cursor-pointer flex-1 h-11.5 flex items-center justify-center bg-[#ffffff]/90 border border-[#e5deff] text-[#5140b3] hover:bg-[#f0ebff] rounded-full text-[14px] font-semibold transition-all active:scale-[0.98]"
                    type="button"
                    disabled={isLoading}
                  >
                    Skip Now
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
