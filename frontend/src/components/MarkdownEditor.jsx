import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineCode,
  HiOutlineEmojiHappy,
  HiOutlineEye,
  HiOutlineLink,
  HiOutlineMenuAlt2,
  HiOutlinePhotograph,
  HiOutlinePencilAlt,
  HiOutlineTable,
} from 'react-icons/hi';
import { BiBold, BiItalic, BiListOl, BiListUl, BiStrikethrough } from 'react-icons/bi';
import { VscQuote } from 'react-icons/vsc';

import ContentRenderer from './ContentRenderer';
import { compactNumber } from '../utils/format';

/**
 * Markdown 编辑器。
 *
 * 设计取舍：
 *   · 不引入重型富文本库，正文以 Markdown 纯文本存储，便于版本管理与迁移
 *   · 工具栏按钮直接操作 textarea 的选区，行为可预期、可测试
 *   · 支持实时预览，写作时所见即所得
 */

const TOOLBAR = [
  { key: 'h2', icon: HiOutlineMenuAlt2, label: '二级标题', prefix: '## ' },
  { key: 'bold', icon: BiBold, label: '加粗', wrap: ['**', '**'] },
  { key: 'italic', icon: BiItalic, label: '斜体', wrap: ['*', '*'] },
  { key: 'strike', icon: BiStrikethrough, label: '删除线', wrap: ['~~', '~~'] },
  { key: 'quote', icon: VscQuote, label: '引用', prefix: '> ' },
  { key: 'code', icon: HiOutlineCode, label: '行内代码', wrap: ['`', '`'] },
  { key: 'codeblock', icon: HiOutlineEye, label: '代码块', block: '```\n' },
  { key: 'ul', icon: BiListUl, label: '无序列表', prefix: '- ' },
  { key: 'ol', icon: BiListOl, label: '有序列表', prefix: '1. ' },
  { key: 'link', icon: HiOutlineLink, label: '链接', wrap: ['[', '](https://)'] },
  { key: 'image', icon: HiOutlinePhotograph, label: '图片', wrap: ['![图片描述](', ')'] },
  {
    key: 'table',
    icon: HiOutlineTable,
    label: '表格',
    block: '| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |\n',
  },
  { key: 'emoji', icon: HiOutlineEmojiHappy, label: '表情', insert: ' 😊 ' },
];

const MarkdownEditor = forwardRef(
  ({ value = '', onChange, placeholder = '开始写下你的想法…', minHeight = 420 }, ref) => {
    const textareaRef = useRef(null);
    const [preview, setPreview] = useState(false);

    // 暴露给父组件，便于外部聚焦或插入内容
    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      insert: (text) => insertText(text, ''),
      getTextarea: () => textareaRef.current,
    }));

    /** 在光标处插入文本，并恢复光标位置 */
    const insertText = useCallback(
      (before, after = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = value.slice(start, end);
        const next =
          value.slice(0, start) + before + selected + after + value.slice(end);

        onChange(next);

        // 渲染完成后把光标定位到插入内容的中间
        requestAnimationFrame(() => {
          textarea.focus();
          const cursor = start + before.length + selected.length;
          textarea.setSelectionRange(cursor, cursor);
        });
      },
      [onChange, value]
    );

    /** 在行首添加前缀（列表、引用、标题） */
    const applyPrefix = useCallback(
      (prefix) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const before = value.slice(0, lineStart);

        // 已存在同样的前缀则视为取消
        if (value.startsWith(prefix, lineStart)) {
          const next = before + value.slice(lineStart + prefix.length);
          onChange(next);
          requestAnimationFrame(() => {
            textarea.focus();
            const cursor = Math.max(lineStart, start - prefix.length);
            textarea.setSelectionRange(cursor, cursor);
          });
          return;
        }

        const next = before + prefix + value.slice(lineStart);
        onChange(next);
        requestAnimationFrame(() => {
          textarea.focus();
          const cursor = start + prefix.length;
          textarea.setSelectionRange(cursor, cursor);
        });
      },
      [onChange, value]
    );

    const handleToolbarClick = (item) => {
      if (item.wrap) {
        insertText(item.wrap[0], item.wrap[1]);
      } else if (item.prefix) {
        applyPrefix(item.prefix);
      } else if (item.block) {
        insertText(`\n${item.block}\n`, '');
      } else if (item.insert) {
        insertText(item.insert, '');
      }
    };

    /** Tab 键插入缩进而不是切换焦点 */
    const handleKeyDown = (event) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        insertText('  ', '');
      }
      // Ctrl/Cmd + B 加粗
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        insertText('**', '**');
      }
      // Ctrl/Cmd + I 斜体
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        insertText('*', '*');
      }
    };

    // ---------------- 统计信息 ----------------
    const cjk = (value.match(/[\u4e00-\u9fff]/g) || []).length;
    const words = (value.match(/[A-Za-z0-9]+/g) || []).length;
    const lines = value ? value.split('\n').length : 0;
    const estimateMinutes =
      cjk / 300 + words / 200 < 1 ? '不到 1' : Math.ceil(cjk / 300 + words / 200);

    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 backdrop-blur-md">
        {/* ---------------- 工具栏 ---------------- */}
        <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-white/[0.03] p-2">
          {TOOLBAR.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.key}
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleToolbarClick(item)}
                title={item.label}
                aria-label={item.label}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon className="text-base" />
              </motion.button>
            );
          })}

          <div className="ml-auto flex items-center gap-2 pr-1">
            <span className="hidden text-xs text-ink-500 sm:inline">
              {compactNumber(cjk + words)} 字 · {lines} 行 · 约 {estimateMinutes} 分钟
            </span>
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setPreview((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                preview
                  ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-200'
                  : 'border-white/10 bg-white/5 text-ink-300 hover:text-white'
              }`}
            >
              {preview ? (
                <>
                  <HiOutlinePencilAlt className="text-sm" />
                  继续编辑
                </>
              ) : (
                <>
                  <HiOutlineEye className="text-sm" />
                  实时预览
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* ---------------- 编辑 / 预览区 ---------------- */}
        {preview ? (
          <div className="p-6" style={{ minHeight }}>
            {value.trim() ? (
              <ContentRenderer content={value} />
            ) : (
              <p className="py-16 text-center text-sm text-ink-500">
                还没有内容，切换回编辑模式开始写作吧。
              </p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            spellCheck="false"
            className="w-full resize-y bg-transparent p-6 font-mono text-sm leading-relaxed text-ink-100 placeholder:text-ink-500 focus:outline-none"
            style={{ minHeight }}
          />
        )}

        {/* ---------------- 底部提示 ---------------- */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 bg-white/[0.02] px-4 py-2 text-xs text-ink-500">
          <span>支持 Markdown 语法</span>
          <span className="hidden sm:inline">Tab 缩进</span>
          <span className="hidden sm:inline">Ctrl/⌘ + B 加粗</span>
          <span className="hidden sm:inline">Ctrl/⌘ + I 斜体</span>
          <span className="ml-auto hidden text-ink-600 md:inline">
            代码块使用 ``` 包裹即可自动高亮
          </span>
        </div>
      </div>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';

export default MarkdownEditor;
