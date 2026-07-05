using Microsoft.EntityFrameworkCore;
using System.Reflection;
using Tabibi.Data;
using Tabibi.DTOs;
using Tabibi.Models;

namespace Tabibi.Services
{
    public class PatientService(AppDbContext dbContext)
    {
        public async Task<ServiceResult> UpdateProfileField(string userId, string fieldName, string value)
        {
            var patient = await dbContext.PatientProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

            if (patient == null)
            {
                return ServiceResult.Failure("User doesn't exist!");
            }

            try
            {
                switch (fieldName.ToLower())
                {
                    case "age":
                        if (!string.IsNullOrEmpty(value) && int.TryParse(value, out int age) && age >= 1 && age <= 120)
                            patient.Age = age;
                        else
                            return ServiceResult.Failure("Age has to be a number from 1 to 120!");
                        break;

                    case "weight":
                        if (!string.IsNullOrEmpty(value) && double.TryParse(value, out double weight) && weight > 0 && weight <= 300)
                            patient.Weight = weight;
                        else
                            return ServiceResult.Failure("Weight has to be a number from 0 to 300!");
                        break;

                    case "height":
                        if (!string.IsNullOrEmpty(value) && double.TryParse(value, out double height) && height > 0 && height <= 300)
                            patient.Height = height;
                        else
                            return ServiceResult.Failure("Height has to be a number from 0 to 300!"); break;

                    case "gender":
                        if (value.ToLower() == "male" || value.ToLower() == "female")
                            patient.Gender = (value.ToLower() == "male" ? GenderTypes.Male : GenderTypes.Female);
                        else
                            return ServiceResult.Failure("Gender has to be male or female!");
                        break;

                    case "emergencycontact":
                        string phonePattern = @"^\+?[\d\s-]{8,}$";
                        if (System.Text.RegularExpressions.Regex.IsMatch(value, phonePattern))
                            patient.EmergencyContact = value;
                        else
                            return ServiceResult.Failure("Invalid phone number format!");
                        break;

                    case "address":
                        patient.Address = value;
                        break;

                    default:
                        return ServiceResult.Failure("Field doesn't exist!");
                }

                await dbContext.SaveChangesAsync();
                return ServiceResult.Success();
            }
            catch (Exception ex)
            {
                return ServiceResult.Failure(ex.Message);
            }
        }

        public ServiceResult ValidatePatientExtras(PatientExtraDTO patientData)
        {
            string phonePattern = @"^\+?[\d\s-]{8,}$";

            // Age validation
            if (!string.IsNullOrEmpty(patientData.Age))
            {
                if (!double.TryParse(patientData.Age, out double age) || age < 1 || age > 120)
                {
                    return ServiceResult.Failure("Age has to be a number from 1 to 120!");
                }
            }

            // Weight validation
            if (!string.IsNullOrEmpty(patientData.Weight))
            {
                if (!double.TryParse(patientData.Weight, out double weight) || weight <= 0 || weight > 300)
                {
                    return ServiceResult.Failure("Weight has to be a number from 0 to 300!");
                }
            }

            // Height validation
            if (!string.IsNullOrEmpty(patientData.Height))
            {
                if (!double.TryParse(patientData.Height, out double height) || height <= 0 || height > 300)
                {
                    return ServiceResult.Failure("Height has to be a number from 0 to 300!");
                }
            }

            // Emergency Phone validation
            if (!string.IsNullOrEmpty(patientData.EmergencyContact))
            {
                if (!System.Text.RegularExpressions.Regex.IsMatch(patientData.EmergencyContact, phonePattern))
                {
                    return ServiceResult.Failure("Invalid phone number format!");
                }
            }

            return ServiceResult.Success();
        }

        public async Task<ServiceResult> UpdateData(string userId, PatientExtraDTO patientData)
        {
            var validationResult = ValidatePatientExtras(patientData);
            if (!validationResult.IsSuccess)
            {
                return validationResult;
            }

            var user = await dbContext.PatientProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

            if (user == null)
            {
                return ServiceResult.Failure("User doesn't exist!");
            }

            try
            {
                if (!string.IsNullOrEmpty(patientData.Address))
                    user.Address = patientData.Address;

                if (!string.IsNullOrEmpty(patientData.Age))
                    user.Age = int.Parse(patientData.Age);

                if (!string.IsNullOrEmpty(patientData.Weight))
                    user.Weight = double.Parse(patientData.Weight);

                if (!string.IsNullOrEmpty(patientData.Height))
                    user.Height = double.Parse(patientData.Height);

                if (!string.IsNullOrEmpty(patientData.EmergencyContact))
                    user.EmergencyContact = patientData.EmergencyContact;

                if (patientData.Gender is not null)
                    user.Gender = patientData.Gender == "male" ? GenderTypes.Male : patientData.Gender == "female" ? GenderTypes.Female : null;

                await dbContext.SaveChangesAsync();
                return ServiceResult.Success();
            }
            catch (Exception ex)
            {
                return ServiceResult.Failure(ex.Message);
            }
        }

        public async Task<PatientProfileDTO?> GetProfile(string userId)
        {
            var user = await dbContext.PatientProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == userId);
            if (user is null)
                return null;

            return new PatientProfileDTO
            {
                Name = user.User.FullName,
                Email = user.User.Email!,
                Phone = user.User.PhoneNumber!,
                Age = user.Age.ToString(),
                Gender = user.Gender == GenderTypes.Male ? "Male" : user.Gender == GenderTypes.Female ? "Female" : "",
                Weight = user.Weight.ToString(),
                Height = user.Height.ToString(),
                Emergency = user.EmergencyContact,
                Address = user.Address
            };
        }

        public async Task<PatientDashboardDTO?> GetDashboard(string userId)
        {
            var patient = await dbContext.PatientProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (patient == null) return null;

            var upcomingAppointments = await dbContext.Appointments
                .Include(a => a.Doctor).ThenInclude(d => d.User)
                .Where(a => a.PatientId == patient.PatientId && a.ScheduledAt >= DateTime.UtcNow)
                .OrderBy(a => a.ScheduledAt)
                .Take(5)
                .Select(a => new UpcomingAppointmentDTO
                {
                    AppointmentId = a.AppointmentId,
                    DoctorName = a.Doctor.User.FullName,
                    ScheduledAt = a.ScheduledAt,
                    ConsultationType = a.ConsultationType.ToString(),
                    Status = a.Status.ToString()
                })
                .ToListAsync();

            var recentPrescriptions = await dbContext.Prescriptions
                .Include(p => p.Appointment).ThenInclude(a => a.Doctor).ThenInclude(d => d.User)
                .Where(p => p.Appointment.PatientId == patient.PatientId)
                .OrderByDescending(p => p.IssuedAt)
                .Take(5)
                .Select(p => new RecentPrescriptionDTO
                {
                    PrescriptionId = p.PrescriptionId,
                    DoctorName = p.Appointment.Doctor.User.FullName,
                    IssuedAt = p.IssuedAt,
                    Diagnosis = p.Diagnosis
                })
                .ToListAsync();

            var pendingChatSessionsCount = await dbContext.ChatSessions
                .CountAsync(cs => cs.PatientId == patient.PatientId && cs.DoctorAccepted == null);

            return new PatientDashboardDTO
            {
                FullName = patient.User.FullName,
                UpcomingAppointmentsCount = upcomingAppointments.Count,
                PendingChatSessionsCount = pendingChatSessionsCount,
                UpcomingAppointments = upcomingAppointments,
                RecentPrescriptions = recentPrescriptions
            };
        }

    }
}