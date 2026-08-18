"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Newspaper } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { MobileTopBar } from "@/components/mobile/ui";
import { listPublishedPosts } from "@/lib/api/blog";
import { BlogPost } from "@/lib/api/types";
import { renderBlogContent, stripMarkdown } from "@/lib/markdown";

const PROSE_CLASSES =
  "[&_p]:mt-4 [&_p]:leading-7 [&_p]:text-slate-700 " +
  "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1.5 [&_li]:text-slate-700 " +
  "[&_blockquote]:mt-4 [&_blockquote]:border-l-4 [&_blockquote]:border-brand-300 [&_blockquote]:bg-brand-50/60 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 " +
  "[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:text-brand-700 " +
  "[&_strong]:font-bold [&_strong]:text-slate-900";

function formatDate(date?: string | null) {
  return date ? new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPublishedPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  const post = posts.find((p) => p.slug === slug);
  const morePosts = posts.filter((p) => p.slug !== slug).slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center text-sm text-slate-400">Loading story...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <Newspaper className="mx-auto h-16 w-16 text-slate-300" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Story not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            This post may have been unpublished or the link is incorrect.
          </p>
          <Link
            href="/blogs"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden sm:block">
        <SiteHeader />
      </div>
      <div className="px-4 pt-4 sm:hidden">
        <MobileTopBar />
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to blog
        </button>

        <article className="mt-5">
          <div className="relative h-64 w-full overflow-hidden rounded-[2rem] border border-slate-100 bg-slate-900 sm:h-[450px]">
            {post.thumbnail && (
              <>
                {/* Blurred background for wide images */}
                <img 
                  src={post.thumbnail} 
                  alt="" 
                  className="absolute inset-0 h-full w-full object-cover opacity-40 blur-2xl saturate-150"
                  aria-hidden="true"
                />
                {/* Actual image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={post.thumbnail} 
                  alt={post.title} 
                  className="relative z-10 h-full w-full object-contain drop-shadow-2xl"
                  loading="lazy"
                  decoding="async"
                />
              </>
            )}
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-brand-500">
            <CalendarDays className="h-3.5 w-3.5" /> {formatDate(post.publishedOn)}
          </p>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-slate-950 sm:text-5xl leading-tight">
            {post.title}
          </h1>

          <div
            className={PROSE_CLASSES}
            dangerouslySetInnerHTML={{ __html: renderBlogContent(post.content) }}
          />
        </article>

        {morePosts.length > 0 && (
          <section className="mt-16 border-t border-slate-100 pt-8 pb-10">
            <h2 className="font-display text-xl font-black tracking-tight text-slate-900">More stories</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {morePosts.map((p) => (
                <Link
                  key={p._id}
                  href={`/blogs/${p.slug}`}
                  className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="h-28 w-full overflow-hidden bg-slate-100">
                    {p.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail} alt={p.title} className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 font-display text-base font-black text-slate-950 leading-tight group-hover:text-brand-600 transition-colors">{p.title}</p>
                    <p className="mt-1.5 line-clamp-2 text-[11px] font-medium text-slate-500 leading-relaxed">{stripMarkdown(p.content)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
