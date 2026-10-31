import type { Metadata } from "next";
import { ChecklogPage } from "@/features/tenant-system/checklog";

export const metadata: Metadata = {
  title: "Nhật ký hệ thống · OneOps",
  description:
    "Dấu vết thao tác toàn hệ thống: người thực hiện, hành động, đối tượng, giá trị trước và sau, lý do và các lần ghi đè ngoài phạm vi.",
};

export default function Page() {
  return <ChecklogPage />;
}
