"use client";

import { usePathname } from "next/navigation";
import GlobalFilters from "./GlobalFilters";

export function ConditionalFilters() {
  const pathname = usePathname();
  
  // Don't show global filters on NDI pages or Prestanda page
  if (pathname.startsWith('/ndi') || pathname.startsWith('/prestanda')) {
    return null;
  }
  
  return <GlobalFilters />;
}
