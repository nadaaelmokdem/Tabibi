import { MdAssignment, MdAdd, MdDelete } from "react-icons/md";
import type { DoctorProfileSectionProps } from "../../types/profile";

interface Props extends DoctorProfileSectionProps {
  availableSpecialties: string[];
  addSpecialtyField: () => void;
  removeSpecialtyField: (index: number) => void;
  handleSpecialtyChange: (index: number, value: string) => void;
}

export default function DoctorSpecialtiesPricingSection({
  formData,
  handleInputChange,
  errors,
  isLoading,
  availableSpecialties,
  addSpecialtyField,
  removeSpecialtyField,
  handleSpecialtyChange,
}: Props) {
  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-surface-variant space-y-6">
      <div className="border-b border-surface-variant pb-3">
        <h2 className="text-lg font-bold text-on-surface">Specialties & Pricing</h2>
        <p className="text-sm text-outline">Your medical focus and consultation rates.</p>
      </div>
      
      {/* Specialties Array Injection */}
      <div className="p-4 bg-surface-container/60 rounded-xl border border-surface-variant space-y-3">
        <div className="flex justify-between items-center mb-1">
          <div>
            <h3 className="text-[13px] lg:text-[14px] font-semibold text-on-surface flex items-center gap-2">
              <MdAssignment className="text-xl text-primary-dark" />
              Offered Specialties
            </h3>
            <p className="text-[11px] text-outline mt-0.5 ml-7">Select one or more medical specialties you practice</p>
          </div>
          <button
            type="button"
            onClick={addSpecialtyField}
            className="flex items-center gap-1 text-[12px] bg-primary-dark text-white font-semibold py-1 px-2.5 rounded-md hover:bg-primary transition-all cursor-pointer"
            disabled={isLoading}
          >
            <MdAdd /> Add Specialty
          </button>
        </div>

        {formData.specialties.map((spec: string, index: number) => (
          <div
            key={index}
            className="flex gap-3 items-center bg-white border border-surface-variant p-3 rounded-lg relative"
          >
            <div className="flex-grow">
              <select
                value={spec}
                onChange={(e) => handleSpecialtyChange(index, e.target.value)}
                className={`w-full h-10 px-3 bg-white border rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-primary-dark transition-all ${
                  errors[`specialty_${index}`]
                    ? "border-red-400 focus:border-red-500"
                    : "border-surface-variant"
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
      <div className="p-4 bg-surface-container rounded-xl border border-surface-variant space-y-4">
        <div>
          <h3 className="text-[13px] lg:text-[14px] font-semibold text-on-surface mb-0.5">
            Consultation Pricing & Availability
          </h3>
          <p className="text-[11px] text-outline mb-2">Set your rates for different types of consultations. Please enter values greater than 0.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Clinic */}
          <div className="bg-white p-4 border border-surface-variant rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[14px] font-semibold text-on-surface">Clinic Visit</label>
              <input
                type="checkbox"
                name="isClinicEnabled"
                checked={formData.isClinicEnabled}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-4 h-4 text-primary-dark rounded cursor-pointer"
              />
            </div>
            {formData.isClinicEnabled && (
              <>
                <div className="flex items-center gap-2 bg-surface-container rounded-md border border-surface-variant px-3 focus-within:ring-1 focus-within:ring-primary-dark focus-within:border-primary-dark overflow-hidden transition-all">
                  <span className="text-outline text-[13px] font-semibold select-none">EGP</span>
                  <input
                    type="number"
                    name="clinicPrice"
                    value={formData.clinicPrice}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="flex-1 h-10 bg-transparent text-[14px] font-medium outline-none text-on-surface"
                  />
                </div>
                {errors.clinicPrice && <p className="text-red-500 text-[11px] mt-1.5 font-medium">{errors.clinicPrice}</p>}
              </>
            )}
          </div>

          {/* Video */}
          <div className="bg-white p-4 border border-surface-variant rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[14px] font-semibold text-on-surface">Video Call</label>
              <input
                type="checkbox"
                name="isVideoCallEnabled"
                checked={formData.isVideoCallEnabled}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-4 h-4 text-primary-dark rounded cursor-pointer"
              />
            </div>
            {formData.isVideoCallEnabled && (
              <>
                <div className="flex items-center gap-2 bg-surface-container rounded-md border border-surface-variant px-3 focus-within:ring-1 focus-within:ring-primary-dark focus-within:border-primary-dark overflow-hidden transition-all">
                  <span className="text-outline text-[13px] font-semibold select-none">EGP</span>
                  <input
                    type="number"
                    name="videoCallPrice"
                    value={formData.videoCallPrice}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="flex-1 h-10 bg-transparent text-[14px] font-medium outline-none text-on-surface"
                  />
                </div>
                {errors.videoCallPrice && <p className="text-red-500 text-[11px] mt-1.5 font-medium">{errors.videoCallPrice}</p>}
              </>
            )}
          </div>

          {/* Chat */}
          <div className="bg-white p-4 border border-surface-variant rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[14px] font-semibold text-on-surface">Chat Consultation</label>
              <input
                type="checkbox"
                name="isChatEnabled"
                checked={formData.isChatEnabled}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-4 h-4 text-primary-dark rounded cursor-pointer"
              />
            </div>
            {formData.isChatEnabled && (
              <>
                <div className="flex items-center gap-2 bg-surface-container rounded-md border border-surface-variant px-3 focus-within:ring-1 focus-within:ring-primary-dark focus-within:border-primary-dark overflow-hidden transition-all">
                  <span className="text-outline text-[13px] font-semibold select-none">EGP</span>
                  <input
                    type="number"
                    name="chatPrice"
                    value={formData.chatPrice}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="flex-1 h-10 bg-transparent text-[14px] font-medium outline-none text-on-surface"
                  />
                </div>
                {errors.chatPrice && <p className="text-red-500 text-[11px] mt-1.5 font-medium">{errors.chatPrice}</p>}
              </>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
