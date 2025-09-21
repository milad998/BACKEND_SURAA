'use client'

export default function LoadingScreen() {
  return (
    <div className="min-h-screen d-flex flex-column justify-content-center align-items-center bg-light">
      <div className="spinner-border text-primary" role="status" style={{ width: '4rem', height: '4rem' }}>
        <span className="visually-hidden">جارٍ التحميل...</span>
      </div>
      <p className="mt-3 fs-5 text-primary fw-semibold">جاري التحميل، يرجى الانتظار...</p>
      <small className="text-muted">قد يستغرق الأمر بضع ثوانٍ.</small>
    </div>
  )
}
