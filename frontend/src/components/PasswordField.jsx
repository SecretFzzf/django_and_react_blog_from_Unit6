import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineLockClosed } from 'react-icons/hi';

import { evaluatePassword } from '../utils/format';

/**
 * 密码输入框。
 *
 * · 内置显示 / 隐藏切换
 * · 可选强度指示条与改进建议
 * · 支持行内错误提示
 */
const PasswordField = ({
  id,
  name,
  label = '密码',
  value,
  onChange,
  placeholder = '请输入密码',
  autoComplete = 'current-password',
  error,
  showStrength = false,
  showHint = false,
  required = false,
  hintText,
}) => {
  const [visible, setVisible] = useState(false);

  const strength = useMemo(
    () => (showStrength ? evaluatePassword(value) : null),
    [value, showStrength]
  );

  return (
    <div>
      {label && (
        <label htmlFor={id} className="label-glass">
          {label}
          {required && <span className="ml-1 text-rose-400">*</span>}
        </label>
      )}

      <div className="relative">
        <HiOutlineLockClosed className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-ink-500" />

        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`input-glass pl-11 pr-12 ${error ? 'input-glass-error' : ''}`}
        />

        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-white/10 hover:text-ink-200"
          aria-label={visible ? '隐藏密码' : '显示密码'}
          tabIndex={-1}
        >
          {visible ? (
            <HiOutlineEyeOff className="text-base" />
          ) : (
            <HiOutlineEye className="text-base" />
          )}
        </button>
      </div>

      {/* 强度指示 */}
      {showStrength && value && (
        <div className="mt-3">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: strength.width }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full"
                style={{ backgroundColor: strength.color }}
              />
            </div>
            <span
              className="w-16 shrink-0 text-right text-xs font-medium"
              style={{ color: strength.color }}
            >
              {strength.label}
            </span>
          </div>

          {showHint && strength.hints.length > 0 && (
            <ul className="mt-2 space-y-1">
              {strength.hints.map((hint) => (
                <li key={hint} className="text-xs text-ink-500">
                  · {hint}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 错误 / 提示 */}
      {error ? (
        <p className="mt-2 text-xs text-rose-400">{error}</p>
      ) : (
        hintText && <p className="mt-2 text-xs text-ink-500">{hintText}</p>
      )}
    </div>
  );
};

export default PasswordField;
