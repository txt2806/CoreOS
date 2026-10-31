import type { Metadata } from "next";
import { PermissionsPage } from "@/features/tenant-system/access-control/roles-permissions";

export const metadata: Metadata = {
  title: "Ma trận quyền · OneOps",
  description:
    "Gán quyền theo chức năng cho vai trò Nhân viên và Quản lý, có lưu có kiểm soát phiên bản và nhật ký kiểm toán.",
};

export default function Page() {
  return <PermissionsPage />;
}
