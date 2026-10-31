import type { Metadata } from "next";
import { WorkflowRulesPage } from "@/features/tenant-system/automation-hub/workflow-rules";

export const metadata: Metadata = {
  title: "Quy tắc tự động · OneOps",
  description:
    "Cấu hình quy tắc khi/then cho công việc: điều kiện theo trường, chuỗi hành động và nhật ký từng lượt chạy.",
};

export default function Page() {
  return <WorkflowRulesPage />;
}
