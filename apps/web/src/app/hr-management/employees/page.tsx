import type { Metadata } from "next";
import { EmployeeDirectoryPage } from "@/features/hr-management/employees/employee-directory";

export const metadata: Metadata = {
  title: "Danh bạ nhân sự · OneOps",
  description:
    "Danh bạ nhân sự có tìm kiếm theo mã, họ tên, email và chức danh; hồ sơ kèm phòng ban, nhóm, người quản lý và trạng thái làm việc.",
};

export default function Page() {
  return <EmployeeDirectoryPage />;
}
