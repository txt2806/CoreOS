import type { Metadata } from "next";
import { TasksPage } from "@/features/work-management/work/tasks";

export const metadata: Metadata = {
  title: "Bảng Kanban · OneOps",
  description: "Bảng công việc theo cột trạng thái, kéo thả trong giới hạn luồng cho phép.",
};

export default function Page() {
  return <TasksPage initialView="board" />;
}
