import { redirect } from "next/navigation";
import { generateUUID } from "@/lib/utils";

export default function ChatRedirect() {
  const id = generateUUID();
  redirect(`/chat/${id}`);
}
