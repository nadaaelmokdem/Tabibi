import React, { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiSave, FiX } from "react-icons/fi";
import type { DoctorProfileData } from "../../types/profilePageProps";

interface Props {
  profile: DoctorProfileData;
  availableSpecialties: string[];
  onSave: (updatedProfile: DoctorProfileData) => Promise<void>;
  disabled?: boolean;
}

export const ServicesAndPricingManager: React.FC<Props> = ({
  profile,
  availableSpecialties,
  onSave,
  disabled,
}) => {
  const [formData, setFormData] = useState<DoctorProfileData>(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setFormData(profile);
    }
  }, [profile, isEditing]);

  const handleAddSpecialty = () => {
    if (availableSpecialties.length === 0) return;
    if (formData.specialties.length >= 3) {
      setError("You can only have up to 3 specialties.");
      return;
    }
    const currentNames = formData.specialties.map(s => typeof s === 'string' ? s : s.name);
    const available = availableSpecialties.find(s => !currentNames.includes(s)) || availableSpecialties[0];
    
    setFormData({
      ...formData,
      specialties: [...formData.specialties, available]
    });
  };

  const handleRemoveSpecialty = (index: number) => {
    const updated = [...formData.specialties];
    updated.splice(index, 1);
    setFormData({ ...formData, specialties: updated });
  };

  const handleSpecialtyChange = (index: number, value: string) => {
    const updated = [...formData.specialties];
    updated[index] = value;
    setFormData({ ...formData, specialties: updated });
  };

  const handlePriceChange = (field: keyof DoctorProfileData, value: string | boolean) => {
    if (typeof value === "boolean") {
      setFormData({ ...formData, [field]: value });
    } else {
      if (value === "") {
        setFormData({ ...formData, [field]: "" as any });
      } else {
        const numValue = Number(value);
        setFormData({ ...formData, [field]: numValue < 0 ? 0 : numValue });
      }
    }
  };

  const handleSave = async () => {
    if (formData.specialties.length === 0) {
      setError("Please add at least one specialty.");
      return;
    }
    
    const uniqueSpecialties = new Set(formData.specialties.map(s => typeof s === 'string' ? s : s.name));
    if (uniqueSpecialties.size !== formData.specialties.length) {
      setError("Duplicate specialties are not allowed.");
      return;
    }
    
    
    if ((formData.isClinicEnabled && formData.clinicPrice <= 0) ||
        (formData.isChatEnabled && formData.chatPrice <= 0) ||
        (formData.isVideoCallEnabled && formData.videoCallPrice <= 0)) {
      setError("Prices must be greater than 0.");
      return;
    }

    if ((formData.chatPrice > formData.clinicPrice && formData.isChatEnabled) ||
        (formData.videoCallPrice > formData.clinicPrice && formData.isVideoCallEnabled)) {

      setError(`Remote consultation prices cannot exceed clinic price (${formData.clinicPrice} EGP).`);
      return;
    }
    
    setError(null);
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    const specialtiesList = formData.specialties.map(s => typeof s === 'string' ? s : s.name);

    return (
      <div className="bg-white p-4 rounded-lg border border-surface-variant shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-primary font-bold">Specialties & Pricing</h3>
          {!disabled && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm bg-surface-variant text-primary-dark px-3 py-1 rounded hover:bg-primary-light transition-colors cursor-pointer"
            >
              {formData.specialties.length === 0 ? "Add Specialties" : "Edit Details"}
            </button>
          )}
        </div>
        {formData.specialties.length === 0 ? (
          <div className="bg-primary/10 border-l-4 border-primary p-3 my-2">
            <p className="text-sm text-primary-dark">
              <strong>Tip:</strong> Please add your specialties and prices.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-l-4 border-primary pl-3">
              <p className="font-bold text-primary-dark mb-2">{specialtiesList.join(', ')}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <div className={`flex flex-col items-start px-3 py-1.5 rounded-md border ${formData.isClinicEnabled ? 'bg-primary/10 border-primary/15 text-primary-dark' : 'bg-surface-container border-surface-variant text-outline-variant'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">Clinic</span>

                  <span className="text-sm font-semibold">{formData.isClinicEnabled ? `${formData.clinicPrice} EGP` : 'Disabled'}</span>
                </div>
                <div className={`flex flex-col items-start px-3 py-1.5 rounded-md border ${formData.isChatEnabled ? 'bg-primary/10 border-primary/15 text-primary-dark' : 'bg-surface-container border-surface-variant text-outline-variant'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">Chat</span>

                  <span className="text-sm font-semibold">{formData.isChatEnabled ? `${formData.chatPrice} EGP` : 'Disabled'}</span>
                </div>
                <div className={`flex flex-col items-start px-3 py-1.5 rounded-md border ${formData.isVideoCallEnabled ? 'bg-primary/10 border-primary/15 text-primary-dark' : 'bg-surface-container border-surface-variant text-outline-variant'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">Video</span>

                  <span className="text-sm font-semibold">{formData.isVideoCallEnabled ? `${formData.videoCallPrice} EGP` : 'Disabled'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-background p-4 rounded-lg border-2 border-primary-light shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-primary font-bold">
          {profile.specialties.length === 0 ? "Add Specialties & Pricing" : "Edit Specialties & Pricing"}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsEditing(false);
              setError(null);
              setFormData(profile);
            }}
            className="p-1.5 bg-surface-variant text-primary-dark rounded hover:bg-primary-light cursor-pointer"
            title="Cancel"
          >
            <FiX size={18} />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1.5 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 cursor-pointer"
            title="Save"
          >
            <FiSave size={18} />
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="mb-4">
        <label className="block text-xs font-bold text-primary-light mb-2">Specialties (Max 3)</label>
        {formData.specialties.map((spec, i) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <select
              value={typeof spec === 'string' ? spec : spec.name}
              onChange={(e) => handleSpecialtyChange(i, e.target.value)}
              className="flex-1 bg-white border border-primary rounded px-2 py-2 text-sm font-semibold text-primary-dark focus:outline-none cursor-pointer"
            >
              {availableSpecialties.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <button
              onClick={() => handleRemoveSpecialty(i)}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
              title="Remove"
            >
              <FiTrash2 />
            </button>
          </div>
        ))}
        {formData.specialties.length < 3 && (
          <button
            onClick={handleAddSpecialty}
            className="mt-2 flex items-center gap-1 text-sm text-primary font-bold hover:text-primary-dark cursor-pointer"
          >
            <FiPlus /> Add Specialty
          </button>
        )}
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded">
        <p className="text-xs text-yellow-800 font-medium">
          Pricing applies to all your specialties. Remote prices cannot exceed clinic prices.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-3 rounded border border-surface-variant">
          <div className="flex items-center gap-1.5 mb-2">
            <label className="flex items-center gap-1.5 cursor-pointer">

              <input type="checkbox" checked={formData.isClinicEnabled ?? true} onChange={(e) => handlePriceChange("isClinicEnabled", e.target.checked)} className="w-4 h-4 cursor-pointer text-primary accent-primary" />
              <span className="block text-xs font-bold text-primary-light">Clinic</span>
            </label>
          </div>

          {formData.isClinicEnabled !== false && (
            <input
              type="number"
              min="1"
              value={formData.clinicPrice || ""}
              onChange={(e) => handlePriceChange("clinicPrice", e.target.value)}
              placeholder="EGP"
              className="w-full bg-background border border-primary rounded px-2 py-2 text-sm text-primary-dark"
            />
          )}
        </div>
        
        <div className="bg-white p-3 rounded border border-surface-variant">
          <div className="flex items-center gap-1.5 mb-2">
            <label className="flex items-center gap-1.5 cursor-pointer">

              <input type="checkbox" checked={formData.isChatEnabled ?? true} onChange={(e) => handlePriceChange("isChatEnabled", e.target.checked)} className="w-4 h-4 cursor-pointer text-primary accent-primary" />
              <span className="block text-xs font-bold text-primary-light">Chat</span>
            </label>
          </div>

          {formData.isChatEnabled !== false && (
            <input
              type="number"
              min="1"
              value={formData.chatPrice || ""}
              onChange={(e) => handlePriceChange("chatPrice", e.target.value)}
              placeholder="EGP"
              className="w-full bg-background border border-primary rounded px-2 py-2 text-sm text-primary-dark"
            />
          )}
        </div>

        <div className="bg-white p-3 rounded border border-surface-variant">
          <div className="flex items-center gap-1.5 mb-2">
            <label className="flex items-center gap-1.5 cursor-pointer">

              <input type="checkbox" checked={formData.isVideoCallEnabled ?? true} onChange={(e) => handlePriceChange("isVideoCallEnabled", e.target.checked)} className="w-4 h-4 cursor-pointer text-primary accent-primary" />
              <span className="block text-xs font-bold text-primary-light">Video</span>
            </label>
          </div>

          {formData.isVideoCallEnabled !== false && (
            <input
              type="number"
              min="1"
              value={formData.videoCallPrice || ""}
              onChange={(e) => handlePriceChange("videoCallPrice", e.target.value)}
              placeholder="EGP"
              className="w-full bg-background border border-primary rounded px-2 py-2 text-sm text-primary-dark"
            />
          )}
        </div>

      </div>
    </div>
  );
};
