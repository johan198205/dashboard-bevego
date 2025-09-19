"use client";

import { usePathname } from "next/navigation";
import GlobalFilters from "./GlobalFilters";

export function ConditionalFilters() {
  const pathname = usePathname();
  
  // Don't show global filters on NDI pages
  if (pathname.startsWith('/ndi')) {
    return null;
  }
  
  return <GlobalFilters />;
}
