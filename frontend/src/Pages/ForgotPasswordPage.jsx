import ForgotPasswordForm from "../Components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ fontFamily: "var(--fb)" }}>
      {/* Left: branding */}
      <div className="flex-1 flex flex-col items-start justify-center p-6 md:p-10 lg:pl-40"
           style={{ background: "var(--bg)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--fp)", fontSize: 48, marginBottom: 8 }}>
            Bit.board
          </h1>
          <p style={{ fontSize: 22, maxWidth: 360, lineHeight: 1.4 }}>
            Forgot your password?
          </p>
          <p style={{ fontSize: 16, marginTop: 8, opacity: 0.7, maxWidth: 320 }}>
            We'll email you a link to reset it.
          </p>
        </div>
      </div>

      {/* Right: forgot-password form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
