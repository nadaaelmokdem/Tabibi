import type { DoctorProfileSectionProps } from "../../types/profile";

interface Props extends DoctorProfileSectionProps {
  profilePicUrl: string;
  profilePicFile: File | null;
  setProfilePicFile: (file: File | null) => void;
  renderProfilePicPreview: (file: File | null, url: string) => React.ReactNode;
  profilePicInputRef: React.RefObject<HTMLInputElement>;
}

export default function DoctorProfileInformationSection({
  formData,
  handleInputChange,
  errors,
  isLoading,
  profilePicUrl,
  profilePicFile,
  setProfilePicFile,
  renderProfilePicPreview,
  profilePicInputRef,
}: Props) {
  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-surface-variant space-y-5">
      <div className="border-b border-surface-variant pb-3">
        <h2 className="text-lg font-bold text-on-surface">Profile Information</h2>
        <p className="text-sm text-outline">Your basic professional details.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Profile Picture */}
        <div className="md:col-span-2 p-4 bg-surface-container rounded-xl border border-surface-variant">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <div className="flex flex-col">
              <label className="text-[13px] lg:text-[14px] font-semibold text-on-surface">
                Profile Picture (Optional)
              </label>
              <span className="text-[11px] text-outline">You can add it later</span>
            </div>
            {renderProfilePicPreview(profilePicFile, profilePicUrl)}
          </div>
          <input
            ref={profilePicInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setProfilePicFile(e.target.files?.[0] || null)}
            className="w-full text-[13px] text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[13px] file:font-semibold file:bg-surface-container file:text-primary-dark hover:file:bg-surface-variant transition-colors"
            disabled={isLoading}
          />
        </div>

        {/* National ID */}
        <div>
          <label className="block text-[13px] lg:text-[14px] font-semibold text-on-surface mb-1">
            National ID Number
          </label>
          <p className="text-[11px] text-outline mb-1.5">Format: 14 consecutive digits</p>
          <input
            name="nationalIdNumber"
            value={formData.nationalIdNumber}
            onChange={handleInputChange}
            className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
              errors.nationalIdNumber
                ? "border-red-400 focus:border-red-500"
                : "border-surface-variant focus:ring-1 focus:ring-primary-dark"
            }`}
            placeholder="e.g. 29901011234567"
            type="text"
            disabled={isLoading}
          />
          {errors.nationalIdNumber && (
            <p className="text-red-500 text-[12px] mt-1 font-medium">{errors.nationalIdNumber}</p>
          )}
        </div>

        {/* License Number */}
        <div>
          <label className="block text-[13px] lg:text-[14px] font-semibold text-on-surface mb-1">
            Medical License Number
          </label>
          <p className="text-[11px] text-outline mb-1.5">Format: Valid professional license ID</p>
          <input
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={handleInputChange}
            className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
              errors.licenseNumber
                ? "border-red-400 focus:border-red-500"
                : "border-surface-variant focus:ring-1 focus:ring-primary-dark"
            }`}
            placeholder="e.g. 123456"
            type="text"
            disabled={isLoading}
          />
          {errors.licenseNumber && (
            <p className="text-red-500 text-[12px] mt-1 font-medium">{errors.licenseNumber}</p>
          )}
        </div>

        {/* License Expiry Date */}
        <div>
          <label className="block text-[13px] lg:text-[14px] font-semibold text-on-surface mb-1">
            License Expiry Date
          </label>
          <p className="text-[11px] text-outline mb-1.5">Must be a future date</p>
          <input
            name="licenseExpiryDate"
            value={formData.licenseExpiryDate}
            onChange={handleInputChange}
            className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
              errors.licenseExpiryDate
                ? "border-red-400 focus:border-red-500"
                : "border-surface-variant focus:ring-1 focus:ring-primary-dark"
            }`}
            type="date"
            disabled={isLoading}
          />
          {errors.licenseExpiryDate && (
            <p className="text-red-500 text-[12px] mt-1 font-medium">{errors.licenseExpiryDate}</p>
          )}
        </div>

        {/* Years of Experience */}
        <div>
          <label className="block text-[13px] lg:text-[14px] font-semibold text-on-surface mb-1">
            Years of Experience
          </label>
          <p className="text-[11px] text-outline mb-1.5">Number of active clinical years</p>
          <input
            name="yearsOfExperience"
            value={formData.yearsOfExperience}
            onChange={handleInputChange}
            className={`w-full h-11 px-4 bg-white border rounded-lg text-[14px] lg:text-[15px] outline-none transition-all ${
              errors.yearsOfExperience
                ? "border-red-400 focus:border-red-500"
                : "border-surface-variant focus:ring-1 focus:ring-primary-dark"
            }`}
            placeholder="e.g. 8"
            type="number"
            min="0"
            disabled={isLoading}
          />
          {errors.yearsOfExperience && (
            <p className="text-red-500 text-[12px] mt-1 font-medium">{errors.yearsOfExperience}</p>
          )}
        </div>

        {/* Professional Bio Statement */}
        <div className="md:col-span-2">
          <label className="block text-[13px] lg:text-[14px] font-semibold text-on-surface mb-0.5">
            Professional Bio (Optional)
          </label>
          <p className="text-[11px] text-outline mb-1.5">You can add it later</p>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            rows={3}
            className="w-full p-3 bg-white border border-surface-variant rounded-lg text-[14px] lg:text-[15px] outline-none transition-all focus:ring-1 focus:ring-primary-dark resize-none"
            placeholder="Brief description about your clinical focus, background, and achievements..."
            disabled={isLoading}
          />
        </div>
      </div>
    </section>
  );
}
