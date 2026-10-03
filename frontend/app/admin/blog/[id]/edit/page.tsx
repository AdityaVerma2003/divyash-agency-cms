"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import BlogPostForm from "@/components/BlogPostForm";
import PageLoader from "@/components/PageLoader";
import type { BlogPost } from "@/types";

export default function EditBlogPostPage() {
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<BlogPost>(`/admin/blog-posts/${id}`, getAccessToken())
      .then(setPost)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!post) return <PageLoader fullScreen={false} />;
  return <BlogPostForm initialPost={post} />;
}
