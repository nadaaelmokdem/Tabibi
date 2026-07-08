export interface ProfileData {
  fullName: string | undefined;
  email: string | undefined;
  phone: string | undefined;
  age: string | undefined;
  gender: string | undefined;
  weight: string | undefined;
  height: string | undefined;
  emergencyContact: string | undefined;
  address: string | undefined;
  imageUrl: string | undefined;
}

export interface DoctorProfileData {
  fullName: string;
  email: string;
  imageUrl: string;
  nationalIdNumber?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  yearsOfExperience?: string;
  clinicLocation?: string;
  clinicPhoneNumber?: string;
  bio?: string;
  licenseProofUrl?: string;
  idProofUrl?: string;
  degreeProofUrl?: string;
  specialties: any[];
  isVerified?: boolean;
  verificationStatus?: "Pending" | "Approved" | "Rejected" | "NeedsChanges";
  adminComment?: string;
  clinicPrice?: number;
  isClinicEnabled?: boolean;
  chatPrice?: number;
  isChatEnabled?: boolean;
  videoPrice?: number;
  isVideoEnabled?: boolean;
  callPrice?: number;
  isCallEnabled?: boolean;
}

export interface EditableHeaderFieldProps {
  value: string | undefined;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (val: string | undefined) => void;
  onCancel: () => void;
  textClass: string | undefined;
  prefix?: React.ReactNode;
  disabled?: boolean;
}

export interface EditableDetailItemProps {
  icon: React.ReactNode;
  label: string | undefined;
  value: string | undefined;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (val: string | undefined) => void;
  onCancel: () => void;
  type?: string | undefined;
  options?: string[];
  tagOptions?: string[];
  fieldName?: string;
  allowUpload?: boolean;
  disabled?: boolean;
}
