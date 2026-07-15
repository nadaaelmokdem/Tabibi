import { MdAssignment } from "react-icons/md";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import DoctorService from '../../services/doctorService';
import { AxiosError } from "axios";
import ErrorBanner from "../../components/Auth/ErrorBanner";
import { getFileUrl } from "../../utils/fileUtils";
import { CachedImage } from "../../components/common/CachedImage";
import DoctorProfileInformationSection from "../../components/Profile/DoctorProfileInformationSection";
import DoctorClinicInformationSection from "../../components/Profile/DoctorClinicInformationSection";
import DoctorPaperworkSection from "../../components/Profile/DoctorPaperworkSection";
import DoctorSpecialtiesPricingSection from "../../components/Profile/DoctorSpecialtiesPricingSection";
export default function DoctorAdditionalData() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
    clinicPrice: "",
    isClinicEnabled: true,
    chatPrice: "",
    isChatEnabled: true,
    videoCallPrice: "",
    isVideoCallEnabled: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const licenseProofInputRef = useRef<HTMLInputElement>(null);
  const idProofInputRef = useRef<HTMLInputElement>(null);
  const degreeProofInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchProfile = async () => {
      try {
        const [profile, specialtiesList] = await Promise.all([
          DoctorService.getProfile(),
          DoctorService.getSpecialties()
        ]);
        
        if (!isMounted) return;

        // Guard: if the doctor required data is null, don't bypass the DoctorAdditionalData page
        const isDataMissing = !profile.licenseNumber || !profile.nationalIdNumber || !profile.licenseProofUrl;
        if (!location.state?.fromSignIn) {
          if (isDataMissing) {
            setHasAccess(true);
          } else {
            setHasAccess(false);
          }
        }

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
          clinicPrice: profile.clinicPrice?.toString() || "",
          isClinicEnabled: profile.isClinicEnabled ?? true,
          chatPrice: profile.chatPrice?.toString() || "",
          isChatEnabled: profile.isChatEnabled ?? true,
          videoCallPrice: profile.videoCallPrice?.toString() || "",
          isVideoCallEnabled: profile.isVideoCallEnabled ?? true,
        });

        if (profile.licenseProofUrl) {
          setLicenseProofUrl(profile.licenseProofUrl);
        }
        if (profile.idProofUrl) {
          setIdProofUrl(profile.idProofUrl);
        }
        if (profile.degreeProofUrl) {
          setDegreeProofUrl(profile.degreeProofUrl);
        }
        // @ts-expect-error Ignoring missing imageUrl on profile type
        const picUrl = profile.profilePictureUrl || profile.imageUrl;
        if (picUrl) {
          setProfilePicUrl(picUrl);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch profile", err);
        if (!location.state?.fromSignIn) {
          setHasAccess(false);
        }
      }
    };
    fetchProfile();
    
    return () => { isMounted = false; };
  }, [user?.id]); // fetch profile once when component mounts

  const [hasAccess, setHasAccess] = useState<boolean | null>(location.state?.fromSignIn ? true : null);

  useEffect(() => {
    if (location.state?.fromSignIn) {
      const newState = { ...location.state };
      delete newState.fromSignIn;
      navigate(location.pathname, { replace: true, state: newState });
    }
  }, [location.pathname, location.state, navigate]);

  if (hasAccess === false) {
    return <Navigate to="/doctor-profile" replace />;
  }

  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }


  const handleProofChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
    errorKey: string
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        setErrors((prev) => ({ ...prev, [errorKey]: "Only images and PDFs are allowed." }));
        setFile(null);
        e.target.value = "";
        return;
      }
      setErrors((prev) => ({ ...prev, [errorKey]: "" }));
      setFile(file);
    } else {
      setFile(null);
    }
  };

  const renderProofPreview = (file: File | null, url: string, setFile: (file: File | null) => void, setUrl: (url: string) => void, inputRef?: React.RefObject<HTMLInputElement>) => {
    const handleRemove = () => {
      setFile(null);
      setUrl("");
      if (inputRef?.current) {
        inputRef.current.value = "";
      }
    };

    if (file) {
      if (file.type.startsWith("image/")) {
        return (
          <div className="relative mt-2">
            <img src={URL.createObjectURL(file)} alt="Preview" className="h-24 w-24 object-cover rounded-lg border border-surface-variant" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
              disabled={isLoading}
            >
              ×
            </button>
          </div>
        );
      }
      if (file.type === "application/pdf") {
        return (
          <div className="mt-2 flex items-center gap-2 text-primary-dark font-medium">
            <MdAssignment className="text-xl" /> <span>{file.name}</span>
            <button
              type="button"
              onClick={handleRemove}
              className="ml-2 text-red-500 hover:text-red-600 text-xs underline"
              disabled={isLoading}
            >
              Remove
            </button>
          </div>
        );
      }
    }
    if (url) {
      if (url.toLowerCase().endsWith(".pdf") || url.includes(".pdf?")) {
        return (
          <div className="mt-2 text-[12px] flex items-center gap-2">
            Current proof: <a href={getFileUrl(url)} target="_blank" rel="noreferrer" className="text-primary-dark font-medium underline flex items-center gap-1"><MdAssignment/> View PDF</a>
            <button
              type="button"
              onClick={handleRemove}
              className="ml-2 text-red-500 hover:text-red-600 text-xs underline"
              disabled={isLoading}
            >
              Remove
            </button>
          </div>
        );
      }
      return (
        <div className="relative mt-2 text-[12px] flex items-center gap-2">
          Current proof: <a href={getFileUrl(url)} target="_blank" rel="noreferrer" className="text-primary-dark font-medium underline"><CachedImage src={url} alt="Current Preview" className="h-24 w-24 object-cover rounded-lg border border-surface-variant" /></a>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
            disabled={isLoading}
          >
            ×
          </button>
        </div>
      );
    }
    return null;
  };



  const renderProfilePicPreview = (file: File | null, url: string) => {
    const handleRemove = () => {
      setProfilePicFile(null);
      setProfilePicUrl("");
      if (profilePicInputRef.current) {
        profilePicInputRef.current.value = "";
      }
    };

    if (file) {
      return (
        <div className="relative mt-3">
          <img src={URL.createObjectURL(file)} alt="Profile Preview" className="h-24 w-24 object-cover rounded-full border-2 border-surface-variant" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
            disabled={isLoading}
          >
            ×
          </button>
        </div>
      );
    }
    if (url) {
      return (
        <div className="relative mt-3">
          <img src={getFileUrl(url)} alt="Current Profile" className="h-24 w-24 object-cover rounded-full border-2 border-surface-variant" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
            disabled={isLoading}
          >
            ×
          </button>
        </div>
      );
    }
    return null;
  };

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
    // Proof Validation
    if (!licenseProofFile && !licenseProofUrl) {
      newErrors.licenseProof = "Please upload a file proof of your license.";
    }
    
    if (!idProofFile && !idProofUrl) {
      newErrors.idProof = "Please upload your ID proof.";
    }

    if (!degreeProofFile && !degreeProofUrl) {
      newErrors.degreeProof = "Please upload your degree proof.";
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
    validatePrice(formData.videoCallPrice, formData.isVideoCallEnabled, "videoCallPrice");

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

      if (licenseProofFile) {
        finalLicenseProofUrl = await DoctorService.uploadProof(licenseProofFile, "licenseProofUrl");
      }
      if (idProofFile) {
        finalIdProofUrl = await DoctorService.uploadProof(idProofFile, "idProofUrl");
      }
      if (degreeProofFile) {
        finalDegreeProofUrl = await DoctorService.uploadProof(degreeProofFile, "degreeProofUrl");
      }
      if (profilePicFile) {
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
        videoCallPrice: parseFloat(formData.videoCallPrice || "0"),
        isVideoCallEnabled: formData.isVideoCallEnabled,
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
    <div className="bg-surface-bright text-on-surface text-[15px] lg:text-[16px] leading-[24px] font-normal antialiased h-screen max-h-screen overflow-hidden flex flex-col selection:bg-primary selection:text-surface-container">
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
                <h1 className="text-[24px] lg:text-[28px] leading-[30px] lg:leading-[36px] font-bold text-on-surface">
                  Welcome, Dr. {user?.fullName}!
                </h1>
                <p className="text-[14px] leading-[20px] text-on-surface-variant">
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

                <DoctorProfileInformationSection
                  formData={formData}
                  handleInputChange={handleInputChange}
                  errors={errors}
                  isLoading={isLoading}
                  profilePicUrl={profilePicUrl}
                  profilePicFile={profilePicFile}
                  setProfilePicFile={setProfilePicFile}
                  renderProfilePicPreview={renderProfilePicPreview}
                  profilePicInputRef={profilePicInputRef}
                />

                <DoctorClinicInformationSection
                  formData={formData}
                  handleInputChange={handleInputChange}
                  errors={errors}
                  isLoading={isLoading}
                />

                <DoctorPaperworkSection
                  errors={errors}
                  isLoading={isLoading}
                  licenseProofFile={licenseProofFile}
                  licenseProofUrl={licenseProofUrl}
                  setLicenseProofFile={setLicenseProofFile}
                  setLicenseProofUrl={setLicenseProofUrl}
                  licenseProofInputRef={licenseProofInputRef}
                  idProofFile={idProofFile}
                  idProofUrl={idProofUrl}
                  setIdProofFile={setIdProofFile}
                  setIdProofUrl={setIdProofUrl}
                  idProofInputRef={idProofInputRef}
                  degreeProofFile={degreeProofFile}
                  degreeProofUrl={degreeProofUrl}
                  setDegreeProofFile={setDegreeProofFile}
                  setDegreeProofUrl={setDegreeProofUrl}
                  degreeProofInputRef={degreeProofInputRef}
                  handleProofChange={handleProofChange}
                  renderProofPreview={renderProofPreview}
                />

                <DoctorSpecialtiesPricingSection
                  formData={formData}
                  handleInputChange={handleInputChange}
                  errors={errors}
                  isLoading={isLoading}
                  availableSpecialties={availableSpecialties}
                  addSpecialtyField={addSpecialtyField}
                  removeSpecialtyField={removeSpecialtyField}
                  handleSpecialtyChange={handleSpecialtyChange}
                />

                {/* Operations Layer */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 mt-8 border-t border-surface-variant">
                  <button
                    type="button"
                    className={`w-full sm:w-auto px-10 h-12 flex items-center justify-center bg-primary text-white hover:bg-primary-dark rounded-xl text-[15px] font-bold transition-all shadow-md active:scale-[0.98] ${
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
