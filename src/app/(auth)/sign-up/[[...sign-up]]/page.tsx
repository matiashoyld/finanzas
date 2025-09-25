import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Finanzas HZ
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Crear nueva cuenta
        </p>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none",
          }
        }}
      />
    </div>
  )
}