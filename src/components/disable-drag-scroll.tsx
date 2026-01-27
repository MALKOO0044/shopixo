"use client";

import { useEffect } from "react";

export default function DisableDragScroll() {
  useEffect(() => {
    const preventDragScroll = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const isFormElement = tagName === "input" || tagName === "textarea" || tagName === "select";
      const isContentEditable = target.isContentEditable;
      const isScrollable = target.closest(".allow-drag-scroll");
      
      if (!isFormElement && !isContentEditable && !isScrollable) {
        if (e.buttons === 1) {
          e.preventDefault();
        }
      }
    };

    const preventDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const isFormElement = tagName === "input" || tagName === "textarea" || tagName === "select";
      
      if (!isFormElement) {
        e.preventDefault();
      }
    };

    const preventSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const isFormElement = tagName === "input" || tagName === "textarea" || tagName === "select";
      const isContentEditable = target.isContentEditable;
      
      if (!isFormElement && !isContentEditable) {
        e.preventDefault();
      }
    };

    document.addEventListener("dragstart", preventDragStart, { passive: false });
    document.addEventListener("selectstart", preventSelectStart, { passive: false });
    document.addEventListener("mousemove", preventDragScroll, { passive: false });

    return () => {
      document.removeEventListener("dragstart", preventDragStart);
      document.removeEventListener("selectstart", preventSelectStart);
      document.removeEventListener("mousemove", preventDragScroll);
    };
  }, []);

  return null;
}
