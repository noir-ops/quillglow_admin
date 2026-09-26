import type React from "react"
import { AdminLayoutWrapper } from "@/components/admin-layout-wrapper"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
}
