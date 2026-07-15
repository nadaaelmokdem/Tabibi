export interface DoctorSearchFilter {
  name?: string;
  specialtyId?: number;
  minPrice?: number;
  maxPrice?: number;
  bookingTypes?: number[]; // ConsultationType enum
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DoctorListSpecialty {
  specialtyId: number;
  name: string;
}

export interface DoctorListItem {
  doctorId: number;
  userId: string;
  fullName: string;
  profilePictureUrl?: string;
  averageRating: number;
  yearsOfExperience?: number;
  clinicLocation?: string;
  bio?: string;
  isVerified?: boolean;
  specialties: DoctorListSpecialty[];
  clinicPrice: number;
  isClinicEnabled: boolean;
  chatPrice: number;
  isChatEnabled: boolean;
  videoCallPrice: number;
  isVideoCallEnabled: boolean;
}
