import type { Metadata } from "next";
import { AccountsPage } from "@/features/tenant-system/access-control/accounts";

export const metadata: Metadata = {
  title: "Tài khoản · OneOps",
  description: "Cấp tài khoản nội bộ, khoá hoặc mở khoá và theo dõi lịch sử thay đổi quyền truy cập.",
};

export default function Page() {
  return <AccountsPage />;
}
