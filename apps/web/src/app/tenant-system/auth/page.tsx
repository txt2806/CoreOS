import type { Metadata } from "next";
import { LoginPage } from "@/features/tenant-system/access-control/tenant-auth";

export const metadata: Metadata = {
  title: "Đăng nhập · OneOps",
  description: "Đăng nhập vào hệ thống vận hành nội bộ OneOps bằng tài khoản do quản trị viên cấp.",
};

export default function Page() {
  return <LoginPage />;
}
