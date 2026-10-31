import type { Metadata } from "next";
import { InternalChatPage } from "@/features/work-management/coordination/internal-chat";

export const metadata: Metadata = {
  title: "Trao đổi nội bộ · OneOps",
  description:
    "Mạch trao đổi theo ca vận hành: danh sách cuộc trao đổi, nội dung tin nhắn và trạng thái mở/đóng.",
};

export default function Page() {
  return <InternalChatPage />;
}
