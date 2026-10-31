import type { Metadata } from "next";
import { WorkPoliciesPage } from "@/features/tenant-system/organization/work-policies";

export const metadata: Metadata = {
  title: "Chính sách làm việc · OneOps",
  description:
    "Cấu hình giờ làm, ngày làm việc, ân hạn đi muộn, ngày lễ, mạng văn phòng và hạn mức phép theo năm.",
};

export default function Page() {
  return <WorkPoliciesPage />;
}
