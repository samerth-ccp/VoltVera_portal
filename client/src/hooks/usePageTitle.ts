import { useEffect } from "react";

export function usePageTitle(title: string, description?: string) {
  useEffect(() => {
    const suffix = " | VoltveraShop";
    document.title = title + suffix;
    
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", description);
      }
    }
    
    return () => {
      document.title = "VoltveraShop - Premium Water Purification Machines | MLM Platform";
    };
  }, [title, description]);
}
