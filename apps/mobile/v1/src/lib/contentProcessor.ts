export const processHTMLContent = (htmlContent: string, theme: any) => {
  if (!htmlContent) return htmlContent;

  let processed = htmlContent;

  // Add inline styles to pre tags (code blocks)
  processed = processed.replace(
    /<pre([^>]*)>/gi,
    `<pre$1 style="background-color: ${theme.colors.muted}!important; border: none!important; border-radius: 8px!important; padding: 12px!important; margin: 8px 0!important; font-family: ui-monospace, SFMono-Regular, Consolas, Monaco, monospace!important; font-size: 14px!important; line-height: 1.4!important; color: ${theme.colors.foreground}!important; overflow: auto!important;">`
  );

  // Add inline styles to code tags (inline code)
  processed = processed.replace(
    /<code([^>]*)>/gi,
    `<code$1 style="background-color: ${theme.colors.muted}!important; border: none!important; border-radius: 4px!important; padding: 2px 6px!important; font-family: ui-monospace, SFMono-Regular, Consolas, Monaco, monospace!important; font-size: 14px!important; color: ${theme.colors.foreground}!important;">`
  );

  // Add inline styles to blockquote tags
  processed = processed.replace(
    /<blockquote([^>]*)>/gi,
    `<blockquote$1 style="background-color: ${theme.colors.muted}!important; border-left: 4px solid ${theme.colors.primary}!important; padding: 12px 16px!important; margin: 8px 0!important; font-style: italic!important; color: ${theme.colors.foreground}!important;">`
  );

  return processed;
};