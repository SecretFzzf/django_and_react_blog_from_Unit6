import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineX } from 'react-icons/hi';

import api from '../services/api';

/**
 * 标签输入组件。
 *
 * · 回车 / 逗号 / 空格 均可确认标签
 * · 退格键在空输入时删除最后一个标签
 * · 自动向后端拉取已有标签做输入联想，也允许创建新标签
 */
const TagInput = ({
  value = [],
  onChange,
  max = 10,
  placeholder = '输入标签后按回车确认',
}) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allTags, setAllTags] = useState([]);

  // 拉取已有标签，用于联想
  useEffect(() => {
    let cancelled = false;
    api
      .get('/tags/')
      .then(({ data }) => {
        if (!cancelled) setAllTags(data?.results || []);
      })
      .catch(() => {
        /* 联想失败不影响手动输入 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 输入变化时计算联想列表
  useEffect(() => {
    const keyword = input.trim().toLowerCase();
    if (!keyword) {
      setSuggestions([]);
      return;
    }
    setSuggestions(
      allTags
        .filter(
          (tag) =>
            tag.name.toLowerCase().includes(keyword) &&
            !value.includes(tag.name)
        )
        .slice(0, 6)
    );
  }, [input, allTags, value]);

  const addTag = (raw) => {
    const name = String(raw || '').trim().replace(/^#/, '');
    if (!name) return;
    if (value.includes(name)) {
      setInput('');
      return;
    }
    if (value.length >= max) return;
    onChange([...value, name]);
    setInput('');
    setSuggestions([]);
  };

  const removeTag = (name) => {
    onChange(value.filter((tag) => tag !== name));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === '，') {
      event.preventDefault();
      addTag(input);
      return;
    }
    if (event.key === 'Backspace' && !input && value.length) {
      removeTag(value[value.length - 1]);
    }
  };

  const handlePaste = (event) => {
    const text = event.clipboardData?.getData('text');
    if (text && /[,，\n]/.test(text)) {
      event.preventDefault();
      text
        .split(/[,，\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, max - value.length)
        .forEach((item) => addTag(item));
    }
  };

  return (
    <div className="relative">
      <div className="input-glass flex min-h-[3.25rem] flex-wrap items-center gap-2 py-2.5">
        <AnimatePresence mode="popLayout">
          {value.map((tag) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.18 }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-200"
            >
              # {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-indigo-300/70 transition-colors hover:text-white"
                aria-label={`移除标签 ${tag}`}
              >
                <HiOutlineX className="text-sm" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => input.trim() && addTag(input)}
          disabled={value.length >= max}
          placeholder={value.length >= max ? `最多添加 ${max} 个标签` : placeholder}
          className="min-w-[10rem] flex-1 bg-transparent px-1 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {/* 联想下拉 */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="glass-panel absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto p-1.5 shadow-glass"
          >
            {suggestions.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addTag(tag.name);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <span># {tag.name}</span>
                  <span className="text-xs text-ink-500">
                    {tag.count} 篇
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <p className="mt-2 text-xs text-ink-500">
        已添加 {value.length} / {max} 个标签，回车确认，支持粘贴批量导入
      </p>
    </div>
  );
};

export default TagInput;
