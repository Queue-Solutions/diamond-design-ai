import { Image, MessageSquareText, Plus, Settings } from "lucide-react";

export const navigationItems = [
  {
    title: "Chat History",
    href: "/chat",
    icon: MessageSquareText
  },
  {
    title: "New Design",
    href: "/chat?new=true",
    icon: Plus
  },
  {
    title: "Saved Designs",
    href: "/gallery",
    icon: Image
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings
  }
];
