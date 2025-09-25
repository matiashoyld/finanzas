import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-4xl font-bold text-red-600">Acceso Denegado</h1>
        <p className="text-gray-700">
          Lo sentimos, tu email no está autorizado para acceder a este sistema.
        </p>
        <p className="text-sm text-gray-600">
          Solo los usuarios con emails autorizados pueden acceder a Finanzas HZ.
        </p>
        <div className="pt-4">
          <Link
            href="/sign-in"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}