import { BlogList } from "@/components/admin/BlogList";

export const metadata = { title: "Blog posts" };

export default function AdminBlogRoute() {
  return <BlogList />;
}
