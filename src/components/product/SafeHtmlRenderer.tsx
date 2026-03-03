"use client";

import { useMemo } from "react";

function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const scripts = doc.querySelectorAll('script');
  scripts.forEach(s => s.remove());
  
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  return doc.body.innerHTML;
}

interface SafeHtmlRendererProps {
  html: string;
  className?: string;
}

export default function SafeHtmlRenderer({ html, className = "" }: SafeHtmlRendererProps) {
  const sanitizedHtml = useMemo(() => {
    if (!html) return "";
    return sanitizeHtml(html);
  }, [html]);

  if (!sanitizedHtml) return null;

  return (
    <div
      className={`prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

export function extractTextFromHtml(html: string): string {
  if (!html) return "";
  
  return html
    .replace(/<img[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractImagesFromHtml(html: string): string[] {
  if (!html) return [];
  
  const images: string[] = [];
  
  const imgTagRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgTagRegex.exec(html)) !== null) {
    const src = match[1];
    if (src && isValidImageUrl(src)) {
      images.push(normalizeUrl(src));
    }
  }
  
  const urlRegex = /https?:\/\/[^\s<>"']+\.(jpg|jpeg|png|gif|webp)(\?[^\s<>"']*)?/gi;
  while ((match = urlRegex.exec(html)) !== null) {
    const url = match[0];
    if (url && isValidImageUrl(url)) {
      const normalized = normalizeUrl(url);
      if (!images.includes(normalized)) {
        images.push(normalized);
      }
    }
  }
  
  return images;
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("placeholder") || lowerUrl.includes("blank") || lowerUrl.includes("1x1")) {
      return false;
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  if (url.startsWith("http://")) {
    return "https://" + url.slice(7);
  }
  return url;
}

export function parseProductDescription(description: string): {
  textContent: string;
  extractedImages: string[];
  highlights: string[];
} {
  if (!description) {
    return { textContent: "", extractedImages: [], highlights: [] };
  }

  const extractedImages = extractImagesFromHtml(description);
  
  let textContent = description
    .replace(/<img[^>]*>/gi, "")
    .replace(/src="[^"]*"/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/?(p|div|span)[^>]*>/gi, "")
    .replace(/<\/?b>/gi, "")
    .replace(/<\/?strong>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();

  const highlights: string[] = [];
  
  const fabricMatch = textContent.match(/Fabric\s*(?:name)?:?\s*([^,\n.]+)/i);
  if (fabricMatch) {
    highlights.push(`Material: ${fabricMatch[1].trim()}`);
  }

  const functionMatch = textContent.match(/Function:?\s*([^.]+)/i);
  if (functionMatch) {
    const functions = functionMatch[1].split(",").map(f => f.trim()).slice(0, 4);
    highlights.push(`Features: ${functions.join(", ")}`);
  }

  const styleMatch = textContent.match(/Style:?\s*([^,\n.]+)/i);
  if (styleMatch) {
    highlights.push(`Style: ${styleMatch[1].trim()}`);
  }

  textContent = textContent
    .replace(/Product\s*information:?\s*/gi, "")
    .replace(/Product\s*Image:?\s*/gi, "")
    .replace(/Packing\s*list:?\s*/gi, "Package includes: ")
    .trim();

  return { textContent, extractedImages, highlights };
}
