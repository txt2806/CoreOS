import type { Metadata } from "next";
import { PositionsGradesPage } from "@/features/hr-management/organization/positions-grades";

export const metadata: Metadata = {
  title: "Chức danh & cấp bậc · OneOps",
  description:
    "Danh mục chức danh và thang cấp bậc của tổ chức — thuộc tính hồ sơ nhân sự, không phải vai trò hệ thống.",
};

export default function Page() {
  return <PositionsGradesPage />;
}
