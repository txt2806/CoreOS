import type { Metadata } from "next";
import { KnowledgeSopPage } from "@/features/work-management/coordination/knowledge-sop";

export const metadata: Metadata = {
  title: "Ghi chú & quy trình chuẩn · OneOps",
  description:
    "Kho hướng dẫn và quy trình chuẩn của ca vận hành: tìm theo mã hoặc tên bài, đọc toàn văn và xuất bản.",
};

export default function Page() {
  return <KnowledgeSopPage />;
}
