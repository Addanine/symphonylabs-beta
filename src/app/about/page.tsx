"use client";

import { useEffect, useState } from "react";
import NavigationWrapper from "~/components/NavigationWrapper";

export default function AboutPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/documents/about.txt")
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load about.txt:", err);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <NavigationWrapper />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold tracking-wide mb-8">about</h1>

        <div className="brutalist-border bg-white p-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-2xl animate-pulse">[ loading ]</div>
            </div>
          ) : (
            <pre className="font-mono text-sm tracking-wide leading-relaxed whitespace-pre-wrap">
              {content}
            </pre>
          )}
        </div>
      </div>
    </main>
  );
}
