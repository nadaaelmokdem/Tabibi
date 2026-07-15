export interface DoctorProfileFormData {
  id: string;
  licenseNumber: string;
  nationalIdNumber: string;
  clinicLocation: string;
  clinicPhoneNumber: string;
  licenseExpiryDate: string;
  yearsOfExperience: string;
  bio: string;
  specialties: string[];
  clinicPrice: string;
  isClinicEnabled: boolean;
  chatPrice: string;
  isChatEnabled: boolean;
  videoCallPrice: string;
  isVideoCallEnabled: boolean;
}

export interface DoctorProfileSectionProps {
  formData: DoctorProfileFormData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: Record<string, string>;
  isLoading: boolean;
}
