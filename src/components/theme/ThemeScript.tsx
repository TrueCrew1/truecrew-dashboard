export function ThemeScript() {
  const script = `(function(){try{var k="truecrew.theme";var s=localStorage.getItem(k);var d=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=d;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
