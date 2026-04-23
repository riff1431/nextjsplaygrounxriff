"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { usePageContent } from "@/hooks/usePageContent";

interface DynamicPageContentProps {
    /** The admin_settings key, e.g. "page_privacy_policy" */
    pageKey: string;
    /** Static/fallback JSX rendered when no DB content exists */
    fallback: React.ReactNode;
}

/**
 * Renders DB-stored Markdown content (from admin Important Pages editor).
 * Falls back to the original static JSX if no content has been published.
 */
export default function DynamicPageContent({ pageKey, fallback }: DynamicPageContentProps) {
    const { content, loading } = usePageContent(pageKey);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-6 w-2/3 bg-white/5 rounded-lg" />
                <div className="h-4 w-full bg-white/5 rounded-lg" />
                <div className="h-4 w-5/6 bg-white/5 rounded-lg" />
                <div className="h-4 w-4/5 bg-white/5 rounded-lg" />
                <div className="h-20 w-full bg-white/5 rounded-xl" />
                <div className="h-4 w-3/4 bg-white/5 rounded-lg" />
            </div>
        );
    }

    // If admin has published content, render it as Markdown
    if (content) {
        return (
            <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-gray-100 prose-a:text-pink-400 prose-strong:text-white prose-li:text-gray-400 prose-code:text-cyan-400 prose-hr:border-white/10">
                <ReactMarkdown>{content}</ReactMarkdown>
            </div>
        );
    }

    // No DB content → render original static JSX
    return <>{fallback}</>;
}
