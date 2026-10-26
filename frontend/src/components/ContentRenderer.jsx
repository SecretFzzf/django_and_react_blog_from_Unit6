import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HiCheck, HiOutlineClipboardCopy } from 'react-icons/hi';

/**
 * 文章正文渲染器。
 *
 * 支持两种内容格式：
 *   1. Markdown（新编辑器产出的内容）—— 走 react-markdown + GFM
 *   2. HTML（早期富文本编辑器产出的历史内容）—— 走 DOMPurify 净化后渲染
 *
 * 两条路径最终都通过同一套后处理逻辑注入：
 *   · 语法高亮（highlight.js）
 *   · 代码块一键复制按钮
 *   · 代码块语言标签
 */

// ==================================================================
// 复制到剪贴板（兼容非 HTTPS 环境）
// ==================================================================
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 继续走下面的兜底方案 */
  }

  // 兜底：临时 textarea + execCommand
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

// ==================================================================
// 内容格式判断
// ==================================================================
const BLOCK_HTML_RE = /<(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|figure|section|article|img|br|span|strong|em)\b[^>]*>/i;

/** 判断内容是否为 HTML（历史富文本内容） */
function looksLikeHtml(content) {
  const text = String(content || '').trim();
  if (!text) return false;
  // 以块级标签开头，或正文中存在成对的块级标签
  if (/^<(p|div|h[1-6]|ul|ol|blockquote|pre|table|figure|section)\b/i.test(text)) {
    return true;
  }
  return BLOCK_HTML_RE.test(text);
}

/** 统计内容中是否含有 Markdown 特征语法 */
function looksLikeMarkdown(content) {
  const text = String(content || '');
  return /(^|\n)\s*(#{1,6}\s|```|~~~|>\s|[-*+]\s|\d+\.\s|\|.*\|)/.test(text) ||
    /\*\*[^*]+\*\*/.test(text) ||
    /\[[^\]]+\]\([^)]+\)/.test(text);
}

// ==================================================================
// 代码块增强（用于 HTML 路径的 DOM 注入）
// ==================================================================
function enhanceCodeBlocks(container) {
  if (!container) return;

  const pres = Array.from(container.querySelectorAll('pre'));

  pres.forEach((pre) => {
    // 清理上一次注入的节点，避免重复渲染时叠加
    pre.querySelectorAll('.code-copy-btn, .code-lang-label').forEach(
      (el) => el.remove()
    );

    // Quill 等富文本编辑器的代码块可能没有 <code> 子元素，补齐结构
    let code = pre.querySelector('code');
    if (!code) {
      code = document.createElement('code');
      code.textContent = pre.textContent || '';
      pre.textContent = '';
      pre.appendChild(code);
    }

    // 语法高亮
    if (code.dataset.highlighted !== 'true') {
      try {
        hljs.highlightElement(code);
      } catch {
        /* 高亮失败不影响内容展示 */
      }
    }

    // 语言标签
    const langMatch = (code.className || '').match(/language-([\w+#-]+)/);
    if (langMatch) {
      const label = document.createElement('span');
      label.className = 'code-lang-label';
      label.textContent = langMatch[1];
      pre.appendChild(label);
    }

    // 复制按钮
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy-btn';
    button.dataset.copied = 'false';
    button.setAttribute('aria-label', '复制代码');
    button.innerHTML =
      '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" ' +
      'stroke-linecap="round" stroke-linejoin="round" height="13" width="13" ' +
      'xmlns="http://www.w3.org/2000/svg"><rect x="9" y="9" width="13" height="13" ' +
      'rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1">' +
      '</path></svg><span>复制</span>';

    button.addEventListener('click', async () => {
      const ok = await copyToClipboard(code.innerText || '');
      button.dataset.copied = ok ? 'true' : 'false';
      button.querySelector('span').textContent = ok ? '已复制' : '复制失败';
      if (ok) {
        setTimeout(() => {
          button.dataset.copied = 'false';
          const span = button.querySelector('span');
          if (span) span.textContent = '复制';
        }, 2000);
      }
    });

    pre.appendChild(button);
  });
}

// ==================================================================
// 代码块组件（Markdown 路径，由 React 渲染复制按钮）
// ==================================================================
const CodeBlock = ({ children }) => {
  const preRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState('');

  useLayoutEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const code = pre.querySelector('code');
    if (!code) return;

    const match = (code.className || '').match(/language-([\w+#-]+)/);
    setLanguage(match ? match[1] : '');

    if (code.dataset.highlighted !== 'true') {
      try {
        hljs.highlightElement(code);
      } catch {
        /* 高亮失败不影响内容展示 */
      }
    }
  }, [children]);

  const handleCopy = async () => {
    const code = preRef.current?.querySelector('code');
    const ok = await copyToClipboard(code?.innerText || '');
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      {language && <span className="code-lang-label">{language}</span>}
      <button
        type="button"
        onClick={handleCopy}
        data-copied={copied ? 'true' : 'false'}
        className="code-copy-btn"
        aria-label="复制代码"
      >
        {copied ? (
          <>
            <HiCheck className="text-sm" />
            <span>已复制</span>
          </>
        ) : (
          <>
            <HiOutlineClipboardCopy className="text-sm" />
            <span>复制</span>
          </>
        )}
      </button>
      <pre ref={preRef}>{children}</pre>
    </div>
  );
};

// ==================================================================
// 主组件
// ==================================================================
const ContentRenderer = ({ content = '', className = '' }) => {
  const htmlContainerRef = useRef(null);
  const isHtml = looksLikeHtml(content) && !looksLikeMarkdown(content);

  // HTML 路径：净化后渲染，再注入高亮与复制按钮
  const safeHtml = isHtml
    ? DOMPurify.sanitize(String(content), {
        ADD_ATTR: ['target', 'rel', 'class', 'align'],
        FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
      })
    : '';

  useEffect(() => {
    if (isHtml) {
      enhanceCodeBlocks(htmlContainerRef.current);
    }
  }, [safeHtml, isHtml]);

  // Markdown 路径
  const markdownComponents = {
    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
    a: ({ children, ...props }) => (
      <a {...props} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    ),
    img: ({ alt, ...props }) => (
      <img {...props} alt={alt || '文章配图'} loading="lazy" />
    ),
    table: ({ children, ...props }) => (
      <div className="my-6 overflow-x-auto rounded-xl border border-white/10">
        <table {...props}>{children}</table>
      </div>
    ),
  };

  if (isHtml) {
    return (
      <div
        ref={htmlContainerRef}
        className={`article-content ${className}`}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  return (
    <div className={`article-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {String(content || '')}
      </ReactMarkdown>
    </div>
  );
};

export default ContentRenderer;
