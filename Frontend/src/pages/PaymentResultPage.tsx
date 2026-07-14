import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle, FaCalendarAlt } from "react-icons/fa";
import { useEffect } from "react";

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const orderId = searchParams.get("orderId");
  const successStr = searchParams.get("success");
  const sessionId = searchParams.get("sessionId");
  const type = searchParams.get("type");
  const isSuccess = successStr === "true" || successStr === "True";

  useEffect(() => {
    if (isSuccess && sessionId) {
      if (type === "video") {
        navigate(`/video-call/${sessionId}`, { replace: true });
      } else if (type === "chat") {
        navigate(`/chat/${sessionId}`, { replace: true });
      }
    }
  }, [isSuccess, sessionId, type, navigate]);

  return (
    <div className="min-h-screen bg-surface-container flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-surface-variant relative overflow-hidden">
        
        {/* Background blobs for premium feel */}
        <div className={`absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl opacity-20 ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <div className={`absolute -bottom-16 -left-16 w-32 h-32 rounded-full blur-3xl opacity-20 ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}></div>
        
        <div className="relative z-10 flex flex-col items-center">
          {isSuccess ? (
            <>
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-green-100">
                <FaCheckCircle className="text-5xl text-green-500" />
              </div>
              <h2 className="text-3xl font-extrabold text-primary-dark mb-2">Payment Successful!</h2>
              <p className="text-text-muted mb-6">Your appointment has been confirmed. Order ID: <span className="font-semibold text-on-surface">{orderId}</span></p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
                <FaTimesCircle className="text-5xl text-red-500" />
              </div>
              <h2 className="text-3xl font-extrabold text-primary-dark mb-2">Payment Failed</h2>
              <p className="text-text-muted mb-6">There was an issue processing your payment. Please try booking again.</p>
            </>
          )}

          <div className="flex flex-col w-full gap-3 mt-4">
            <Link 
              to="/appointments"
              className="w-full flex justify-center items-center gap-2 px-6 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-primary hover:bg-primary-dark shadow-md transition-all hover:-translate-y-0.5"
            >
              <FaCalendarAlt /> My Appointments
            </Link>
            <Link 
              to="/doctors"
              className="w-full flex justify-center items-center px-6 py-3.5 border-2 border-surface-variant text-base font-bold rounded-xl text-on-surface-variant bg-white hover:bg-surface-container hover:text-primary-dark transition-colors"
            >
              Back to Doctors
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
