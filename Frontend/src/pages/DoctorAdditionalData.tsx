import { MdLocationOn, MdAssignment, MdAdd, MdDelete } from "react-icons/md";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import DoctorService from '../services/doctorService';
import { AxiosError } from "axios";
import ErrorBanner from "../components/Auth/ErrorBanner";

export default function DoctorAdditionalData() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [licenseProofType, setLicenseProofType] = useState<"file" | "link">("file");
  const [idProofType, setIdProofType] = useState<"file" | "link">("file");
  const [degreeProofType, setDegreeProofType] = useState<"file" | "link">("file");
  const [profilePicType, setProfilePicType] = useState<"file" | "link">("file");
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);

  // File states
  const [licenseProofFile, setLicenseProofFile] = useState<File | null>(null);
  const [licenseProofUrl, setLicenseProofUrl] = useState<string>("");
  
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [idProofUrl, setIdProofUrl] = useState<string>("");

  const [degreeProofFile, setDegreeProofFile] = useState<File | null>(null);
  const [degreeProofUrl, setDegreeProofUrl] = useState<string>("");

  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string>("");

  const [formData, setFormData] = useState<any>({
    id: user?.id || "",
    licenseNumber: "",
    nationalIdNumber: "",
    clinicLocation: "",
    clinicPhoneNumber: "",
    licenseExpiryDate: "",
    yearsOfExperience: "",
    bio: "",
    specialties: [""],
    clinicPrice: "0",
    isClinicEnabled: true,
    chatPrice: "0",
    isChatEnabled: true,
    videoPrice: "0",
    isVideoEnabled: true,
    callPrice: "0",
    isCallEnabled: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  useEffect(() => {
    if (!location.state?.fromSignIn) return;
    
    const fetchProfile = async () => {
      try {
        const [profile, specialtiesList] = await Promise.all([
          DoctorService.getProfile(),
          DoctorService.getSpecialties()
        ]);
        setAvailableSpecialties(specialtiesList.map(s => s.name));
        setFormData({
          id: user?.id || "",
          licenseNumber: profile.licenseNumber || "",
          nationalIdNumber: profile.nationalIdNumber || "",
          clinicLocation: profile.clinicLocation || "",
          clinicPhoneNumber: profile.clinicPhoneNumber || "",
          licenseExpiryDate: profile.licenseExpiryDate ? profile.licenseExpiryDate.split('T')[0] : "",
          yearsOfExperience: profile.yearsOfExperience?.toString() || "",
          bio: profile.bio || "",
           
          specialties: profile.specialties && profile.specialties.length > 0 
            ? profile.specialties.map((ds: any) => ds.specialtyName)
            : [""],
          clinicPrice: profile.clinicPrice?.toString() || "0",
          isClinicEnabled: profile.isClinicEnabled ?? true,
          chatPrice: profile.chatPrice?.toString() || "0",
          isChatEnabled: profile.isChatEnabled ?? true,
          videoPrice: profile.videoPrice?.toString() || "0",
          isVideoEnabled: profile.isVideoEnabled ?? true,
          callPrice: profile.callPrice?.toString() || "0",
          isCallEnabled: profile.isCallEnabled ?? true,
        });

        if (profile.licenseProofUrl) {
          setLicenseProofType("link");
          setLicenseProofUrl(profile.licenseProofUrl);
        }
        if (profile.idProofUrl) {
          setIdProofType("link");
          setIdProofUrl(profile.idProofUrl);
        }
        if (profile.degreeProofUrl) {
          setDegreeProofType("link");
          setDegreeProofUrl(profile.degreeProofUrl);
        }
        // @ts-expect-error Ignoring missing imageUrl on profile type
        const picUrl = profile.profilePictureUrl || profile.imageUrl;
        if (picUrl) {
          setProfilePicType("link");
          setProfilePicUrl(picUrl);
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };
    fetchProfile();
  }, [location.state?.fromSignIn, user?.id]);
  const hasAccess = useRef(location.state?.fromSignIn);

  useEffect(() => {
    if (location.state?.fromSignIn) {
      const newState = { ...location.state };
      delete newState.fromSignIn;
      navigate(location.pathname, { replace: true, state: newState });
    }
  }, [location.pathname, location.state, navigate]);

  if (!hasAccess.current) {
    return <Navigate to="/doctor-profile" replace />;
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = "License number is required.";
    } else if (!/^\d+$/.test(formData.licenseNumber.trim())) {
      newErrors.licenseNumber = "Must contain digits only (Egyptian Medical Syndicate number).";
    }

    if (!formData.nationalIdNumber.trim()) {
      newErrors.nationalIdNumber = "National ID is required.";
    } else if (!/^(2|3)\d{13}$/.test(formData.nationalIdNumber.trim())) {
      newErrors.nationalIdNumber = "Must be a valid 14-digit Egyptian National ID.";
    }
    if (!formData.licenseExpiryDate) {
      newErrors.licenseExpiryDate = "Expiry date is required.";
    } else {
      const selectedDate = new Date(formData.licenseExpiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        newErrors.licenseExpiryDate = "Must be a future date.";
      }
    }

    if (
      !formData.yearsOfExperience ||
      isNaN(Number(formData.yearsOfExperience)) ||
      Number(formData.yearsOfExperience) < 0
    ) {
      newErrors.yearsOfExperience = "Enter a valid number of years.";
    }

    // Proof Validation
    if (licenseProofType === "file" && !licenseProofFile) {
      newErrors.licenseProof = "Please upload a file proof of your license.";
    } else if (licenseProofType === "link") {
      if (!licenseProofUrl.trim()) {
        newErrors.licenseProof = "Please provide a valid URL link.";
      } else {
        try {
          const url = new URL(licenseProofUrl.trim());
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            newErrors.licenseProof = "Please provide a valid HTTP/HTTPS URL.";
          }
        } catch {
          newErrors.licenseProof = "Please provide a valid URL link.";
        }
      }
    }
    
    if (idProofType === "file" && !idProofFile) {
      newErrors.idProof = "Please upload your ID proof.";
    } else if (idProofType === "link") {
      if (!idProofUrl.trim()) {
        newErrors.idProof = "Please provide a valid URL link for ID proof.";
      } else {
        try {
          const url = new URL(idProofUrl.trim());
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            newErrors.idProof = "Please provide a valid HTTP/HTTPS URL.";
          }
        } catch {
          newErrors.idProof = "Please provide a valid URL link for ID proof.";
        }
      }
    }

    if (degreeProofType === "file" && !degreeProofFile) {
      newErrors.degreeProof = "Please upload your degree proof.";
    } else if (degreeProofType === "link") {
      if (!degreeProofUrl.trim()) {
        newErrors.degreeProof = "Please provide a valid URL link for degree proof.";
      } else {
        try {
          const url = new URL(degreeProofUrl.trim());
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            newErrors.degreeProof = "Please provide a valid HTTP/HTTPS URL.";
          }
        } catch {
          newErrors.degreeProof = "Please provide a valid URL link for degree proof.";
        }
      }
    }

    // Specialties Validation
    const seenSpecialties = new Set<string>();
    formData.specialties.forEach((spec: string, index: any) => {
      const trimmedSpec = spec.trim();
      if (!trimmedSpec) {
        if (formData.specialties.length > 1) {
          newErrors[`specialty_${index}`] = "Specialty name is required.";
        }
      } else if (seenSpecialties.has(trimmedSpec)) {
        newErrors[`specialty_${index}`] = "Duplicate specialties are not allowed.";
      } else {
        seenSpecialties.add(trimmedSpec);
      }
    });

    const validatePrice = (price: string, enabled: boolean, field: string) => {
      if (enabled && (price === "" || isNaN(Number(price)) || Number(price) <= 0)) {
        newErrors[field] = "Enter a valid price greater than 0.";
      }
    };
    validatePrice(formData.clinicPrice, formData.isClinicEnabled, "clinicPrice");
    validatePrice(formData.chatPrice, formData.isChatEnabled, "chatPrice");
    validatePrice(formData.videoPrice, formData.isVideoEnabled, "videoPrice");
    validatePrice(formData.callPrice, formData.isCallEnabled, "callPrice");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const target = e.target as HTMLInputElement;
    const name = target.name;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    
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
      (_: any, i: number) => i !== index,
    );
    setFormData({ ...formData, specialties: updatedSpecialties });
  };

  const handleSaveAndContinue = async () => {
    setGlobalError("");
    if (!validateForm()) {
        setGlobalError("Please correct the highlighted errors before submitting.");
        return;
    }

    try {
      setIsLoading(true);
      
      let finalLicenseProofUrl = licenseProofUrl;
      let finalIdProofUrl = idProofUrl;
      let finalDegreeProofUrl = degreeProofUrl;
      let finalProfilePicUrl = profilePicUrl;

      if (licenseProofType === "file" && licenseProofFile) {
        finalLicenseProofUrl = await DoctorService.uploadProof(licenseProofFile, "licenseProofUrl");
      }
      if (idProofType === "file" && idProofFile) {
        finalIdProofUrl = await DoctorService.uploadProof(idProofFile, "idProofUrl");
      }
      if (degreeProofType === "file" && degreeProofFile) {
        finalDegreeProofUrl = await DoctorService.uploadProof(degreeProofFile, "degreeProofUrl");
      }
      if (profilePicType === "file" && profilePicFile) {
        finalProfilePicUrl = await DoctorService.uploadProof(profilePicFile, "profilePictureUrl");
      }

      const bulkData = {
        licenseNumber: formData.licenseNumber,
        nationalIdNumber: formData.nationalIdNumber,
        licenseExpiryDate: formData.licenseExpiryDate,
        yearsOfExperience: parseInt(formData.yearsOfExperience),
        clinicLocation: formData.clinicLocation,
        clinicPhoneNumber: formData.clinicPhoneNumber,
        bio: formData.bio,
        specialties: formData.specialties,
        licenseProofUrl: finalLicenseProofUrl,
        idProofUrl: finalIdProofUrl,
        degreeProofUrl: finalDegreeProofUrl,
        profilePictureUrl: finalProfilePicUrl,
        clinicPrice: parseFloat(formData.clinicPrice || "0"),
        isClinicEnabled: formData.isClinicEnabled,
        chatPrice: parseFloat(formData.chatPrice || "0"),
        isChatEnabled: formData.isChatEnabled,
        videoPrice: parseFloat(formData.videoPrice || "0"),
        isVideoEnabled: formData.isVideoEnabled,
        callPrice: parseFloat(formData.callPrice || "0"),
        isCallEnabled: formData.isCallEnabled,
      };

      await DoctorService.bulkUpdateProfile(bulkData);
      setIsLoading(false);
      navigate("/");
    } catch (error) {
      if (
        error instanceof AxiosError &&
        error.response &&
        error.response.data
      ) {
        const errorData = error.response.data;
        if (errorData.errors) {
            const backendErrors: Record<string, string> = {};
            Object.keys(errorData.errors).forEach(key => {
                const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
                backendErrors[camelKey] = Array.isArray(errorData.errors[key]) ? errorData.errors[key].join(", ") : errorData.errors[key];
            });
            setErrors(prev => ({ ...prev, ...backendErrors }));
            setGlobalError("Please correct the highlighted backend errors.");
        } else if (Array.isArray(errorData) && errorData.length > 0) {
            setGlobalError(errorData.map((e: any) => e.description || JSON.stringify(e)).join(", "));
        } else if (typeof errorData === "string") {
            setGlobalError(errorData);
        } else if (errorData.title) {
            setGlobalError(errorData.title);
        } else {
            setGlobalError("An error occurred. Please try again.");
        }
      } else if (error instanceof Error) {
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
            <div className="w-full max-w-3xl flex flex-col gap-4 lg:gap-5 bg-white/95 backdrop-blur-md p-6 lg:p-10 rounded-3xl shadow-2xl border border-white/20 max-h-[96vh] overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-1.5 pb-2">
                <h1 className="text-[24px] lg:text-[28px] leading-[30px] lg:leading-[36px] font-bold text-[#1a1345]">
                  Welcome, Dr. {user?.fullName}!
                </h1>
                <p className="text-[14px] leading-[20px] text-[#474553]">
                  Please fulfill your credential application below to finalize
                  verification processes on our network.
                </p>
              </div>

              <form
                className="space-y-6"
                noValidate
                onSubmit={(e) => e.preventDefault()}
              >
                {globalError && <ErrorBanner message={globalError} />}

                {/* Section 1: Profile Information */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-[#e5deff] space-y-5">
                   <div className="border-b border-[#e5deff] pb-3">
                     <h2 className="text-lg font-bold text-[#1a1345]">Profile Information</h2>
                     <p className="text-sm text-[#787584]">Your basic professional details.</p>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Profile Picture */}
                      <div className="md:col-span-2 p-4 bg-[#f8f9fa] rounded-xl border border-[#e5deff]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                          <div className="flex flex-col">
                            <label className="text-[13px] lg:text-[14px] font-semibold text-[#1a1345]">
                              Profile Picture (Optional)
                            </label>
                            <span className="text-[11px] text-[#787584]">You can add it later</span>
                          </div>
                          <div className="flex gap-1 bg-white border p-0.5 rounded-md text-[12px]">
                            <button
                              type="button"
                              onClick={() => setProfilePicType("file")}
                              className={`px-2 py-1 rounded transition-colors cursor-pointer ${profilePicType === "file" ? "bg-[#5140b3] text-white font-medium" : "text-gray-500 hover:bg-gray-100"}`}
                            >
                              File Upload
                            </button>
                            <button
                              type="button"
                              onClick={() => setProfilePicType("link")}
                              className={`px-2 py-1 rounded transition-colors cursor-pointer ${profilePicType === "link" ? "bg-[#5140b3] text-white font-medium" : "text-gray-500 hover:bg-gray-100"}`}
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
                            className="w-full text-[13px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[13px] file:font-semibold file:bg-[#f0ebff] file:text-[#5140b3] hover:file:bg-[#e5deff] transition-colors"
                            disabled={isLoading}
                          />
                        ) : (
                          <input
                            type="url"
                            value={profilePicUrl}
                            onChange={(e) => setProfilePicUrl(e.target.value)}
                            placeholder="https://example.com/avatar.jpg"
                            className="w-full h-10 px-3 bg-white border border-[#e5deff] rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-[#5140b3] transition-all"
                            disabled={isLoading}
                          />
                        )}
                      </div>

                      {/* National ID */}
                      <div>
                        <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1">
                          National ID Number
                        </label>
                        <p className="text-[11px] text-[#787584] mb-1.5">Format: 14 consecutive digits</p>
                        <input
                          name="nationalIdNumber"
                          value={formData.nationalIdNumber}
                          onChange={handleInputChange}
                          className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
                            errors.nationalIdNumber
                              ? "border-red-400 focus:border-red-500"
                              : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3]"
                          }`}
                          placeholder="e.g. 29901011234567"
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
                        <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1">
                          Medical License Number
                        </label>
                        <p className="text-[11px] text-[#787584] mb-1.5">Format: Valid professional license ID</p>
                        <input
                          name="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={handleInputChange}
                          className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
                            errors.licenseNumber
                              ? "border-red-400 focus:border-red-500"
                              : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3]"
                          }`}
                          placeholder="e.g. 123456"
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
                        <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1">
                          License Expiry Date
                        </label>
                        <p className="text-[11px] text-[#787584] mb-1.5">Must be a future date</p>
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
                        <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1">
                          Years of Experience
                        </label>
                        <p className="text-[11px] text-[#787584] mb-1.5">Number of active clinical years</p>
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
                        <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-0.5">
                          Professional Bio (Optional)
                        </label>
                        <p className="text-[11px] text-[#787584] mb-1.5">You can add it later</p>
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full p-3 bg-white border border-[#e5deff] rounded-lg text-[14px] lg:text-[15px] outline-none transition-all focus:ring-1 focus:ring-[#5140b3] resize-none"
                          placeholder="Brief description about your clinical focus, background, and achievements..."
                          disabled={isLoading}
                        />
                      </div>
                   </div>
                </section>

                {/* Section 2: Clinic Information */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-[#e5deff] space-y-5">
                   <div className="border-b border-[#e5deff] pb-3">
                     <h2 className="text-lg font-bold text-[#1a1345] flex items-center gap-2">
                       <MdLocationOn className="text-[#5140b3]" /> Clinic Information (Optional)
                     </h2>
                     <p className="text-sm text-[#787584]">Details about your physical clinic. You can add it later.</p>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1">
                          Physical Clinic Address
                        </label>
                        <p className="text-[11px] text-[#787584] mb-1.5">Your main practice location</p>
                        <input
                          name="clinicLocation"
                          value={formData.clinicLocation}
                          onChange={handleInputChange}
                          className="w-full h-11 px-4 bg-white border border-[#e5deff] rounded-lg text-[14px] lg:text-[15px] outline-none transition-all focus:ring-1 focus:ring-[#5140b3]"
                          placeholder="Building 4, Medical Square"
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1">
                          Clinic Desk Line
                        </label>
                        <p className="text-[11px] text-[#787584] mb-1.5">Primary contact number</p>
                        <input
                          name="clinicPhoneNumber"
                          value={formData.clinicPhoneNumber}
                          onChange={handleInputChange}
                          className="w-full h-11 px-4 bg-white border border-[#e5deff] rounded-lg text-[14px] lg:text-[15px] outline-none transition-all focus:ring-1 focus:ring-[#5140b3]"
                          placeholder="+202XXXXXXXX"
                          disabled={isLoading}
                        />
                      </div>
                   </div>
                </section>

                {/* Section 3: Paperwork & Verifications */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-[#e5deff] space-y-5">
                   <div className="border-b border-[#e5deff] pb-3">
                     <h2 className="text-lg font-bold text-[#1a1345]">Paperwork & Verifications</h2>
                     <p className="text-sm text-[#787584]">Required documents for your verification process.</p>
                   </div>
                   
                   <div className="space-y-4">
                      {/* License Proof Document */}
                      <div className="p-4 bg-[#f8f9fa] rounded-xl border border-[#e5deff]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                          <div className="flex flex-col">
                            <label className="text-[13px] lg:text-[14px] font-semibold text-[#1a1345]">
                              License Document Verification Proof
                            </label>
                            <span className="text-[11px] text-[#787584]">Required: Upload PDF or image, or provide valid URL</span>
                          </div>
                          <div className="flex gap-1 bg-white border p-0.5 rounded-md text-[12px]">
                            <button
                              type="button"
                              onClick={() => setLicenseProofType("file")}
                              className={`px-2 py-1 rounded transition-colors cursor-pointer ${licenseProofType === "file" ? "bg-[#5140b3] text-white font-medium" : "text-gray-500 hover:bg-gray-100"}`}
                            >
                              File Upload
                            </button>
                            <button
                              type="button"
                              onClick={() => setLicenseProofType("link")}
                              className={`px-2 py-1 rounded transition-colors cursor-pointer ${licenseProofType === "link" ? "bg-[#5140b3] text-white font-medium" : "text-gray-500 hover:bg-gray-100"}`}
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
                            className="w-full text-[13px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[13px] file:font-semibold file:bg-[#f0ebff] file:text-[#5140b3] hover:file:bg-[#e5deff] transition-colors"
                            disabled={isLoading}
                          />
                        ) : (
                          <input
                            type="url"
                            value={licenseProofUrl}
                            onChange={(e) => setLicenseProofUrl(e.target.value)}
                            placeholder="https://example.com/license-proof.pdf"
                            className="w-full h-10 px-3 bg-white border border-[#e5deff] rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-[#5140b3] transition-all"
                            disabled={isLoading}
                          />
                        )}
                        {errors.licenseProof && (
                          <p className="text-red-500 text-[12px] mt-1 font-medium">
                            {errors.licenseProof}
                          </p>
                        )}
                      </div>

                      {/* ID Proof Document */}
                      <div className="p-4 bg-[#f8f9fa] rounded-xl border border-[#e5deff]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                          <div className="flex flex-col">
                            <label className="text-[13px] lg:text-[14px] font-semibold text-[#1a1345]">
                              ID Verification Proof
                            </label>
                            <span className="text-[11px] text-[#787584]">Required: Accepted formats: PDF or image</span>
                          </div>
                          <div className="flex gap-1 bg-white border p-0.5 rounded-md text-[12px]">
                            <button
                              type="button"
                              onClick={() => setIdProofType("file")}
                              className={`px-2 py-1 rounded transition-colors cursor-pointer ${idProofType === "file" ? "bg-[#5140b3] text-white font-medium" : "text-gray-500 hover:bg-gray-100"}`}
                            >
                              File Upload
                            </button>
                            <button
                              type="button"
                              onClick={() => setIdProofType("link")}
                              className={`px-2 py-1 rounded transition-colors cursor-pointer ${idProofType === "link" ? "bg-[#5140b3] text-white font-medium" : "text-gray-500 hover:bg-gray-100"}`}
                            >
                              Web Link
                            </button>
                          </div>
                        </div>
                        {idProofType === "file" ? (
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) =>
                              setIdProofFile(e.target.files?.[0] || null)
                            }
                            className="w-full text-[13px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[13px] file:font-semibold file:bg-[#f0ebff] file:text-[#5140b3] hover:file:bg-[#e5deff] transition-colors"
                            disabled={isLoading}
                          />
                        ) : (
                          <input
                            type="url"
                            value={idProofUrl}
                            onChange={(e) => setIdProofUrl(e.target.value)}
                            placeholder="https://example.com/id-proof.pdf"
                            className="w-full h-10 px-3 bg-white border border-[#e5deff] rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-[#5140b3] transition-all"
                            disabled={isLoading}
                          />
                        )}
                        {errors.idProof && (
                          <p className="text-red-500 text-[12px] mt-1 font-medium">
                            {errors.idProof}
                          </p>
                        )}
                      </div>

                      {/* Degree Proof Document */}
                      <div className="p-4 bg-[#f8f9fa] rounded-xl border border-[#e5deff]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                          <div className="flex flex-col">
                            <label className="text-[13px] lg:text-[14px] font-semibold text-[#1a1345]">
                              Degree Verification Proof
                            </label>
                            <span className="text-[11px] text-[#787584]">Required: Accepted formats: PDF or image</span>
                          </div>
                          <div className="flex gap-1 bg-white border p-0.5 rounded-md text-[12px]">
                            <button
                              type="button"
                              onClick={() => setDegreeProofType("file")}
                              className={`px-2 py-1 rounded transition-colors cursor-pointer ${degreeProofType === "file" ? "bg-[#5140b3] text-white font-medium" : "text-gray-500 hover:bg-gray-100"}`}
                            >
                              File Upload
                            </button>
                            <button
                              type="button"
                              onClick={() => setDegreeProofType("link")}
                              className={`px-2 py-1 rounded transition-colors cursor-pointer ${degreeProofType === "link" ? "bg-[#5140b3] text-white font-medium" : "text-gray-500 hover:bg-gray-100"}`}
                            >
                              Web Link
                            </button>
                          </div>
                        </div>
                        {degreeProofType === "file" ? (
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) =>
                              setDegreeProofFile(e.target.files?.[0] || null)
                            }
                            className="w-full text-[13px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[13px] file:font-semibold file:bg-[#f0ebff] file:text-[#5140b3] hover:file:bg-[#e5deff] transition-colors"
                            disabled={isLoading}
                          />
                        ) : (
                          <input
                            type="url"
                            value={degreeProofUrl}
                            onChange={(e) => setDegreeProofUrl(e.target.value)}
                            placeholder="https://example.com/degree-proof.pdf"
                            className="w-full h-10 px-3 bg-white border border-[#e5deff] rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-[#5140b3] transition-all"
                            disabled={isLoading}
                          />
                        )}
                        {errors.degreeProof && (
                          <p className="text-red-500 text-[12px] mt-1 font-medium">
                            {errors.degreeProof}
                          </p>
                        )}
                      </div>
                   </div>
                </section>

                {/* Section 4: Specialties & Pricing */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-[#e5deff] space-y-6">
                   <div className="border-b border-[#e5deff] pb-3">
                     <h2 className="text-lg font-bold text-[#1a1345]">Specialties & Pricing</h2>
                     <p className="text-sm text-[#787584]">Your medical focus and consultation rates.</p>
                   </div>
                   
                   {/* Specialties Array Injection */}
                   <div className="p-4 bg-[#f6f1ff]/60 rounded-xl border border-[#e5deff] space-y-3">
                     <div className="flex justify-between items-center mb-1">
                       <div>
                         <h3 className="text-[13px] lg:text-[14px] font-semibold text-[#1a1345] flex items-center gap-2">
                           <MdAssignment className="text-xl text-[#5140b3]" />
                           Offered Specialties
                         </h3>
                         <p className="text-[11px] text-[#787584] mt-0.5 ml-7">Select one or more medical specialties you practice</p>
                       </div>
                       <button
                         type="button"
                         onClick={addSpecialtyField}
                         className="flex items-center gap-1 text-[12px] bg-[#5140b3] text-white font-semibold py-1 px-2.5 rounded-md hover:bg-[#6a5acd] transition-all cursor-pointer"
                         disabled={isLoading}
                       >
                         <MdAdd /> Add Specialty
                       </button>
                     </div>

                     {formData.specialties.map((spec: string, index: number) => (
                       <div
                         key={index}
                         className="flex gap-3 items-center bg-white border border-[#e5deff] p-3 rounded-lg relative"
                       >
                         <div className="flex-grow">
                           <select
                             value={spec}
                             onChange={(e) =>
                               handleSpecialtyChange(index, e.target.value)
                             }
                             className={`w-full h-10 px-3 bg-white border rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-[#5140b3] transition-all ${
                               errors[`specialty_${index}`]
                                 ? "border-red-400 focus:border-red-500"
                                 : "border-[#e5deff]"
                             }`}
                             disabled={isLoading}
                           >
                             <option value="">Select a Specialty</option>
                             {availableSpecialties.map(a => (
                               <option key={a} value={a}>{a}</option>
                             ))}
                           </select>
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
                             className="text-red-400 hover:text-red-600 p-1.5 rounded-lg transition-colors bg-red-50 hover:bg-red-100 cursor-pointer"
                             disabled={isLoading}
                           >
                             <MdDelete className="text-xl" />
                           </button>
                         )}
                       </div>
                     ))}
                   </div>

                   {/* Consultation Pricing */}
                   <div className="p-4 bg-[#f8f9fa] rounded-xl border border-[#e5deff] space-y-4">
                     <div>
                       <h3 className="text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-0.5">
                         Consultation Pricing & Availability
                       </h3>
                       <p className="text-[11px] text-[#787584] mb-2">Set your rates for different types of consultations. Please enter values greater than 0.</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {/* Clinic */}
                       <div className="bg-white p-4 border border-[#e5deff] rounded-lg shadow-sm">
                         <div className="flex items-center justify-between mb-3">
                           <label className="text-[14px] font-semibold text-[#1a1345]">Clinic Visit</label>
                           <input
                             type="checkbox"
                             name="isClinicEnabled"
                             checked={formData.isClinicEnabled}
                             onChange={handleInputChange}
                             disabled={isLoading}
                             className="w-4 h-4 text-[#5140b3] rounded cursor-pointer"
                           />
                         </div>
                         {formData.isClinicEnabled && (
                           <>
                             <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-md border border-[#e5deff] px-3 focus-within:ring-1 focus-within:ring-[#5140b3] focus-within:border-[#5140b3] overflow-hidden transition-all">
                               <span className="text-[#787584] text-[13px] font-semibold select-none">EGP</span>
                               <input
                                 type="number"
                                 name="clinicPrice"
                                 value={formData.clinicPrice}
                                 onChange={handleInputChange}
                                 disabled={isLoading}
                                 placeholder="0.00"
                                 min="0"
                                 step="0.01"
                                 className="flex-1 h-10 bg-transparent text-[14px] font-medium outline-none text-[#1a1345]"
                               />
                             </div>
                             {errors.clinicPrice && <p className="text-red-500 text-[11px] mt-1.5 font-medium">{errors.clinicPrice}</p>}
                           </>
                         )}
                       </div>

                       {/* Video */}
                       <div className="bg-white p-4 border border-[#e5deff] rounded-lg shadow-sm">
                         <div className="flex items-center justify-between mb-3">
                           <label className="text-[14px] font-semibold text-[#1a1345]">Video Call</label>
                           <input
                             type="checkbox"
                             name="isVideoEnabled"
                             checked={formData.isVideoEnabled}
                             onChange={handleInputChange}
                             disabled={isLoading}
                             className="w-4 h-4 text-[#5140b3] rounded cursor-pointer"
                           />
                         </div>
                         {formData.isVideoEnabled && (
                           <>
                             <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-md border border-[#e5deff] px-3 focus-within:ring-1 focus-within:ring-[#5140b3] focus-within:border-[#5140b3] overflow-hidden transition-all">
                               <span className="text-[#787584] text-[13px] font-semibold select-none">EGP</span>
                               <input
                                 type="number"
                                 name="videoPrice"
                                 value={formData.videoPrice}
                                 onChange={handleInputChange}
                                 disabled={isLoading}
                                 placeholder="0.00"
                                 min="0"
                                 step="0.01"
                                 className="flex-1 h-10 bg-transparent text-[14px] font-medium outline-none text-[#1a1345]"
                               />
                             </div>
                             {errors.videoPrice && <p className="text-red-500 text-[11px] mt-1.5 font-medium">{errors.videoPrice}</p>}
                           </>
                         )}
                       </div>

                       {/* Chat */}
                       <div className="bg-white p-4 border border-[#e5deff] rounded-lg shadow-sm">
                         <div className="flex items-center justify-between mb-3">
                           <label className="text-[14px] font-semibold text-[#1a1345]">Chat Consultation</label>
                           <input
                             type="checkbox"
                             name="isChatEnabled"
                             checked={formData.isChatEnabled}
                             onChange={handleInputChange}
                             disabled={isLoading}
                             className="w-4 h-4 text-[#5140b3] rounded cursor-pointer"
                           />
                         </div>
                         {formData.isChatEnabled && (
                           <>
                             <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-md border border-[#e5deff] px-3 focus-within:ring-1 focus-within:ring-[#5140b3] focus-within:border-[#5140b3] overflow-hidden transition-all">
                               <span className="text-[#787584] text-[13px] font-semibold select-none">EGP</span>
                               <input
                                 type="number"
                                 name="chatPrice"
                                 value={formData.chatPrice}
                                 onChange={handleInputChange}
                                 disabled={isLoading}
                                 placeholder="0.00"
                                 min="0"
                                 step="0.01"
                                 className="flex-1 h-10 bg-transparent text-[14px] font-medium outline-none text-[#1a1345]"
                               />
                             </div>
                             {errors.chatPrice && <p className="text-red-500 text-[11px] mt-1.5 font-medium">{errors.chatPrice}</p>}
                           </>
                         )}
                       </div>

                       {/* Voice Call */}
                       <div className="bg-white p-4 border border-[#e5deff] rounded-lg shadow-sm">
                         <div className="flex items-center justify-between mb-3">
                           <label className="text-[14px] font-semibold text-[#1a1345]">Voice Call</label>
                           <input
                             type="checkbox"
                             name="isCallEnabled"
                             checked={formData.isCallEnabled}
                             onChange={handleInputChange}
                             disabled={isLoading}
                             className="w-4 h-4 text-[#5140b3] rounded cursor-pointer"
                           />
                         </div>
                         {formData.isCallEnabled && (
                           <>
                             <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-md border border-[#e5deff] px-3 focus-within:ring-1 focus-within:ring-[#5140b3] focus-within:border-[#5140b3] overflow-hidden transition-all">
                               <span className="text-[#787584] text-[13px] font-semibold select-none">EGP</span>
                               <input
                                 type="number"
                                 name="callPrice"
                                 value={formData.callPrice}
                                 onChange={handleInputChange}
                                 disabled={isLoading}
                                 placeholder="0.00"
                                 min="0"
                                 step="0.01"
                                 className="flex-1 h-10 bg-transparent text-[14px] font-medium outline-none text-[#1a1345]"
                               />
                             </div>
                             {errors.callPrice && <p className="text-red-500 text-[11px] mt-1.5 font-medium">{errors.callPrice}</p>}
                           </>
                         )}
                       </div>
                     </div>
                   </div>
                </section>

                {/* Operations Layer */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 mt-8 border-t border-[#e5deff]">
                  <button
                    type="button"
                    className={`w-full sm:w-auto px-10 h-12 flex items-center justify-center bg-[#6a5acd] text-white hover:bg-[#5140b3] rounded-xl text-[15px] font-bold transition-all shadow-md active:scale-[0.98] ${
                      isLoading
                        ? "opacity-70 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    onClick={handleSaveAndContinue}
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "Submit Profile Data"}
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
