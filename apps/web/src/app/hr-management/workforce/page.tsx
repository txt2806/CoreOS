import type { Metadata } from "next";
import { WorkforceBoardPage } from "@/features/hr-management/attendance/workforce-board";

export const metadata: Metadata = {
  title: "Bảng hiện diện · OneOps",
  description:
    "Ai đang ở văn phòng, ai làm từ xa, ai công tác ngoài và ai đang nghỉ phép trong ngày.",
};

export default function Page() {
  return <WorkforceBoardPage />;
}
