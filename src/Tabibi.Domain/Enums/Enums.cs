namespace Tabibi.Domain.Enums
{
    public enum ConsultationType { Chat, Video, Call, Clinic }

    public enum AppointmentStatus { Pending, Confirmed, Completed, Cancelled }

    public enum SessionStatus { Active, Completed, Abandoned, PendingDoctorResponse, Declined }

    public enum GenderTypes { Male, Female }

    public enum PaymentStatus { Pending, Paid, Refunded, Failed }

    public enum PaymentGateway { Stripe, PayPal }
}
