"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Newspaper } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { MobileCard, MobileTopBar } from "@/components/mobile/ui";
import { listPublishedPosts } from "@/lib/api/blog";
import { BlogPost } from "@/lib/api/types";
import { stripMarkdown } from "@/lib/markdown";

function formatDate(date?: string | null) {
  return date ? new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
}

export default function BlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPublishedPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc_45%,_#ffffff_80%)]">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>

      <div className="sm:hidden">
        <div className="px-4 pt-4">
          <MobileTopBar />
        </div>
        <main className="flex flex-col gap-5 px-4 py-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Blog</p>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
              Stories, guides and updates from Book Your Vibe.
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Venue guides, sport tips and community stories, written by our team.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <Link key={post._id} href={`/blogs/${post.slug}`}>
                <MobileCard className="!p-0 overflow-hidden">
                  <div className="h-36 w-full bg-slate-100">
                    {post.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element -- thumbnails are raw base64 data URIs, not next/image-compatible remote URLs
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                      <CalendarDays className="h-3 w-3" /> {formatDate(post.publishedOn)}
                    </p>
                    <h2 className="mt-1.5 line-clamp-2 text-base font-bold text-slate-900">{post.title}</h2>
                  </div>
                </MobileCard>
              </Link>
            ))}

            {!loading && posts.length === 0 && (
              <p className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500">
                No stories published yet. Check back soon.
              </p>
            )}
          </div>
        </main>
      </div>

      <main className="mx-auto hidden max-w-7xl px-4 py-6 sm:block sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-[1.5rem] bg-slate-950 p-5 sm:p-6 shadow-2xl border border-white/10">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
          <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-brand-500/15 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-brand-400 mb-2">
              <Newspaper className="h-3 w-3" /> The BYV Blog
            </span>
            <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl leading-tight text-white">
              Stories, guides and updates from Book Your Vibe.
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400 font-medium max-w-xl">
              Venue guides, sport tips and community stories, written by our team so you can
              plan your next game with confidence.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post._id}
              href={`/blogs/${post.slug}`}
              className="group overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="h-48 w-full overflow-hidden bg-slate-100">
                {post.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element -- thumbnails are raw base64 data URIs, not next/image-compatible remote URLs
                  <img
                    src={post.thumbnail}
                    alt={post.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
              <div className="p-5">
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                  <CalendarDays className="h-3 w-3" /> {formatDate(post.publishedOn)}
                </p>
                <h2 className="line-clamp-2 font-display text-[19px] font-black text-slate-950 leading-tight tracking-tight group-hover:text-brand-600 transition-colors">{post.title}</h2>
                <p className="mt-2 line-clamp-2 text-[13px] font-medium text-slate-500 leading-relaxed">{stripMarkdown(post.content)}</p>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-brand-600 transition-all group-hover:gap-2 group-hover:text-brand-700">
                  Read more <span>&rarr;</span>
                </div>
              </div>
            </Link>
          ))}

          {!loading && posts.length === 0 && (
            <p className="col-span-full rounded-[1.75rem] border border-slate-100 bg-white p-10 text-center text-sm text-slate-500">
              No stories published yet. Check back soon.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
