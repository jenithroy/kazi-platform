import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SITE_URL } from "@/lib/site";
import { createHeadingIds } from "@/lib/stories";

// Story bodies are Markdown written in /admin. Raw HTML in them isn't rendered (react-markdown
// escapes it) and javascript: links are stripped, so a story can't inject script into the
// site. Used for the public story pages (rendered at build time) and the editor preview.

function textContent(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  return textContent(node.props?.children);
}

function internalHref(href) {
  if (!href) return null;
  if (href.startsWith(SITE_URL)) return href.slice(SITE_URL.length) || "/";
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  return null;
}

const linkClass = "text-pine underline decoration-moss/60 underline-offset-[3px] transition-colors hover:text-moss-deep";

const HEADING_CLASS = {
  2: "mb-4 mt-12 font-display text-2xl leading-snug text-pine md:text-[1.75rem]",
  3: "mb-3 mt-9 font-display text-xl leading-snug text-pine",
  4: "mb-2 mt-7 font-body text-base font-semibold text-pine",
};

function components(nextId) {
  function heading(level) {
    return function Heading({ children }) {
      const Tag = `h${level}`;
      return (
        <Tag id={nextId(textContent(children))} className={HEADING_CLASS[level]}>
          {children}
        </Tag>
      );
    };
  }

  return {
    // The story title is the page's only <h1>, so headings in the body start at <h2>.
    h1: heading(2),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(4),
    h6: heading(4),
    p: ({ children }) => <p className="my-5 font-body text-[1.0625rem] leading-[1.8] text-pine-soft">{children}</p>,
    a: ({ href, children }) => {
      const internal = internalHref(href);
      return internal ? (
        <Link href={internal} className={linkClass}>
          {children}
        </Link>
      ) : (
        <a href={href} className={linkClass}>
          {children}
        </a>
      );
    },
    ul: ({ children }) => (
      <ul className="my-5 list-disc space-y-2 pl-6 font-body text-[1.0625rem] leading-[1.75] text-pine-soft marker:text-moss">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-5 list-decimal space-y-2 pl-6 font-body text-[1.0625rem] leading-[1.75] text-pine-soft marker:text-moss">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-1">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="my-8 border-l-2 border-moss pl-5 font-display text-xl italic leading-relaxed text-pine [&_p]:font-display [&_p]:text-xl [&_p]:text-pine">
        {children}
      </blockquote>
    ),
    img: ({ src, alt, title }) =>
      src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- images are unoptimized in the static export */}
          <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" className="my-8 w-full rounded-sm" />
          {title && <span className="-mt-5 mb-8 block text-center font-body text-sm text-pine-soft">{title}</span>}
        </>
      ) : null,
    hr: () => <hr className="my-12 border-pine/15" />,
    table: ({ children }) => (
      <div className="my-8 overflow-x-auto">
        <table className="w-full border-collapse text-left font-body text-sm text-pine-soft">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border-b border-pine/25 px-3 py-2 font-semibold text-pine">{children}</th>,
    td: ({ children }) => <td className="border-b border-pine/10 px-3 py-2 align-top">{children}</td>,
    pre: ({ children }) => (
      <pre className="my-6 overflow-x-auto rounded-sm bg-pine p-4 font-mono text-sm text-bone [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-bone">
        {children}
      </pre>
    ),
    code: ({ children }) => (
      <code className="rounded-sm bg-paper-raised px-1.5 py-0.5 font-mono text-[0.9em] text-pine">{children}</code>
    ),
    strong: ({ children }) => <strong className="font-semibold text-pine">{children}</strong>,
  };
}

export function Markdown({ children }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components(createHeadingIds())}>
      {children ?? ""}
    </ReactMarkdown>
  );
}
