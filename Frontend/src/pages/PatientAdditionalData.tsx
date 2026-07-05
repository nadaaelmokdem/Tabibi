import { MdLocationOn, MdContacts } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type patientExtraData from "../types/extraDataPatient";
import { useAuth } from "../context/AuthContext";
import PatientService from "../services/patientService";
import { AxiosError } from "axios";
import ErrorBanner from "../components/Auth/ErrorBanner";

export default function ContinueData() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Form States
  const [formData, setFormData] = useState<patientExtraData>({
    id: user?.id,
    address: "",
    age: "",
    gender: "",
    weight: "",
    height: "",
    emergencyPhone: "",
  });

  // Error States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Address - completely optional, no format constraints
    // Age - only validate if not empty
    if (
      formData.age &&
      (isNaN(Number(formData.age)) ||
        Number(formData.age) < 1 ||
        Number(formData.age) > 120)
    ) {
      newErrors.age = "Invalid age.";
    }

    // Weight - only validate if not empty
    if (
      formData.weight &&
      (isNaN(Number(formData.weight)) ||
        Number(formData.weight) <= 0 ||
        Number(formData.weight) > 300)
    ) {
      newErrors.weight = "Invalid.";
    }

    // Height - only validate if not empty
    if (
      formData.height &&
      (isNaN(Number(formData.height)) ||
        Number(formData.height) <= 0 ||
        Number(formData.height) > 300)
    ) {
      newErrors.height = "Invalid.";
    }

    // Emergency Phone - only validate format if not empty
    if (
      formData.emergencyPhone &&
      !/^\+?[\d\s-]{8,}$/.test(formData.emergencyPhone)
    ) {
      newErrors.emergencyPhone =
        "Invalid format. (Format: +201012345678 or 01012345678)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSaveAndContinue = async () => {
    setGlobalError("");
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      await PatientService.updatePatientData(formData);
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
            if (descLower.includes("address")) { backendErrors.address = desc; hasMappedError = true; }
            else if (descLower.includes("age")) { backendErrors.age = desc; hasMappedError = true; }
            else if (descLower.includes("gender")) { backendErrors.gender = desc; hasMappedError = true; }
            else if (descLower.includes("weight")) { backendErrors.weight = desc; hasMappedError = true; }
            else if (descLower.includes("height")) { backendErrors.height = desc; hasMappedError = true; }
            else if (descLower.includes("phone") || descLower.includes("emergency")) { backendErrors.emergencyPhone = desc; hasMappedError = true; }
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
        {/* Full-Screen Background Image Layer */}
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
                Care that revolves around you.
              </h2>
              <p className="text-[15px] lg:text-[17px] leading-[23px] lg:leading-[27px] font-normal text-white/90 drop-shadow-sm">
                Join Tabibi today and experience modern healthcare management
                tailored to your needs.
              </p>
            </div>
          </div>

          {/* Right Side: Form Container Center Alignment */}
          <div className="w-full lg:w-[65%] h-full flex items-center justify-center p-4 lg:p-8 ml-auto overflow-hidden">
            {/* Removed overflow-hidden from card container to prevent border styling clips */}
            <div className="w-full max-w-2xl flex flex-col gap-4 lg:gap-5 bg-white/95 backdrop-blur-md p-6 lg:p-10 rounded-3xl shadow-2xl border border-white/20 max-h-[96vh] overflow-y-auto">
              {/* Header Module with Personalized Hello Greeting */}
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-1.5">
                <h1 className="text-[24px] lg:text-[28px] leading-[30px] lg:leading-[36px] font-bold text-[#1a1345]">
                  Hello, {user?.fullName}!
                </h1>
                <p className="text-[14px] leading-[20px] text-[#474553]">
                  Please provide a few more details to help us personalize your
                  medical journey. These fields are optional but recommended.
                </p>
              </div>

              {/* Secure HTML Form Area */}
              <form className="space-y-5" noValidate>
                {globalError && <ErrorBanner message={globalError} />}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Address Module */}
                  <div className="md:col-span-2">
                    <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1.5">
                      Home Address
                    </label>
                    <div className="relative">
                      <MdLocationOn
                        className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl ${errors.address ? "text-red-400" : "text-[#c9c4d5]"}`}
                      />
                      <input
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={`w-full h-11 pl-11 pr-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
                          errors.address
                            ? "border-red-400 focus:border-red-500"
                            : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3] focus:border-[#b8a7ff]"
                        } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                        placeholder="123 Wellness Ave, Health City"
                        type="text"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.address && (
                      <p className="text-red-500 text-[12px] mt-1 font-medium">
                        {errors.address}
                      </p>
                    )}
                  </div>

                  {/* Age Input */}
                  <div>
                    <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1.5">
                      Age
                    </label>
                    <input
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
                        errors.age
                          ? "border-red-400 focus:border-red-500"
                          : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3]"
                      } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                      placeholder="e.g. 28"
                      type="text"
                      disabled={isLoading}
                    />
                    {errors.age && (
                      <p className="text-red-500 text-[12px] mt-1 font-medium">
                        {errors.age}
                      </p>
                    )}
                  </div>

                  {/* Gender Selector */}
                  <div>
                    <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1.5">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all appearance-none ${
                        errors.gender
                          ? "border-red-400 focus:border-red-500"
                          : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3] focus:border-[#b8a7ff]"
                      } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                      disabled={isLoading}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    {errors.gender && (
                      <p className="text-red-500 text-[12px] mt-1 font-medium">
                        {errors.gender}
                      </p>
                    )}
                  </div>

                  {/* Weight Element */}
                  <div>
                    <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1.5">
                      Weight
                    </label>
                    <div className="relative flex items-center">
                      <input
                        name="weight"
                        value={formData.weight}
                        onChange={handleInputChange}
                        className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
                          errors.weight
                            ? "border-red-400 focus:border-red-500"
                            : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3] focus:border-[#b8a7ff]"
                        } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                        placeholder="70"
                        type="text"
                        disabled={isLoading}
                      />
                      <span className="absolute right-4 text-[#a19db3] text-[12px] font-bold">
                        kg
                      </span>
                    </div>
                    {errors.weight && (
                      <p className="text-red-500 text-[12px] mt-1 font-medium">
                        {errors.weight}
                      </p>
                    )}
                  </div>

                  {/* Height Element */}
                  <div>
                    <label className="block text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-1.5">
                      Height
                    </label>
                    <div className="relative flex items-center">
                      <input
                        name="height"
                        value={formData.height}
                        onChange={handleInputChange}
                        className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
                          errors.height
                            ? "border-red-400 focus:border-red-500"
                            : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3] focus:border-[#b8a7ff]"
                        } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                        placeholder="175"
                        type="text"
                        disabled={isLoading}
                      />
                      <span className="absolute right-4 text-[#a19db3] text-[12px] font-bold">
                        cm
                      </span>
                    </div>
                    {errors.height && (
                      <p className="text-red-500 text-[12px] mt-1 font-medium">
                        {errors.height}
                      </p>
                    )}
                  </div>

                  {/* Compact Emergency Contact Sub-Card */}
                  <div
                    className={`md:col-span-2 p-4 bg-[#f6f1ff]/60 rounded-xl border transition-colors ${
                      errors.emergencyName || errors.emergencyPhone
                        ? "border-red-200 bg-red-50/20"
                        : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3]"
                    }`}
                  >
                    <h3 className="text-[13px] lg:text-[14px] font-semibold text-[#1a1345] mb-3 flex items-center gap-2">
                      <MdContacts
                        className={`text-xl ${errors.emergencyName || errors.emergencyPhone ? "text-red-500" : "text-[#5140b3]"}`}
                      />
                      Emergency Contact Info
                    </h3>
                    <div className="w-full flex justify-center">
                      <div className="w-full max-w-md">
                        <input
                          name="emergencyPhone"
                          value={formData.emergencyPhone}
                          onChange={handleInputChange}
                          className={`w-full h-10 px-3.5 bg-white border rounded-lg text-[13px] lg:text-[14px] outline-none transition-all ${
                            errors.emergencyPhone
                              ? "border-red-300 focus:border-red-500"
                              : "border-[#e5deff] focus:ring-1 focus:ring-[#5140b3] focus:border-[#b8a7ff]"
                          }`}
                          placeholder="+201012345678"
                          type="tel"
                          disabled={isLoading}
                        />

                        {errors.emergencyPhone ? (
                          <p className="text-red-500 text-[11px] mt-1 font-medium text-center">
                            {errors.emergencyPhone}
                          </p>
                        ) : (
                          <p className="text-gray-400 text-[11px] mt-1 font-normal leading-relaxed text-center">
                            This number is used in case of emergencies. Please
                            provide a trusted contact, such as a relative or
                            guardian, Do not put your number or a secondary
                            number.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Viewport Operations Layer */}
                <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
                  <button
                    className={`flex-1 h-11.5 flex items-center justify-center bg-[#6a5acd] text-[#f0ebff] hover:bg-[#5140b3] hover:text-white rounded-full text-[14px] font-semibold transition-all shadow-md active:scale-[0.98] ${
                      isLoading
                        ? "opacity-70 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    onClick={() => handleSaveAndContinue()}
                    disabled={isLoading}
                  >
                    {isLoading ? "Loading..." : "Save and Continue"}
                  </button>
                  <button
                    onClick={() => navigate("/")}
                    className="cursor-pointer flex-1 h-11.5 flex items-center justify-center bg-[#ffffff]/90 border border-[#e5deff] focus:ring-1 focus:ring-[#5140b3] text-[#5140b3] hover:bg-[#f0ebff] rounded-full text-[14px] font-semibold transition-all active:scale-[0.98]"
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
