import type { Metadata } from "next";
import { TasksPage } from "@/features/work-management/work/tasks";

export const metadata: Metadata = {
  title: "Công việc · OneOps",
  description: "Danh sách công việc, bộ lọc theo trạng thái và luồng chuyển bước.",
};

export default function Page() {
  return <TasksPage />;
}
