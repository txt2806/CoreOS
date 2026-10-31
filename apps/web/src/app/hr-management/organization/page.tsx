import type { Metadata } from "next";
import { DepartmentsTeamsPage } from "@/features/hr-management/organization/departments-teams";

export const metadata: Metadata = {
  title: "Phòng ban & nhóm · OneOps",
  description:
    "Cơ cấu phòng ban và nhóm trong tổ chức: trạng thái hoạt động, người quản lý và quy tắc mỗi nhân sự thuộc một nhóm.",
};

export default function Page() {
  return <DepartmentsTeamsPage />;
}
