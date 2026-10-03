// General Sans is no longer part of the site's own typography, but it's still offered as a
// text-layer font in the Atelier (lib/design-layers.js TEXT_FONTS), so it's only loaded here.
// React hoists a <link rel="stylesheet" precedence> into <head> and dedupes it.
export default function AtelierLayout({ children }) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        precedence="default"
      />
      {children}
    </>
  );
}
