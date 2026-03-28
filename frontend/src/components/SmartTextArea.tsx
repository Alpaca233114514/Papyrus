import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Input, Spin } from '@arco-design/web-react';
import { useCompletion } from '../hooks/useCompletion';
import type { TextAreaProps, RefTextAreaType } from '@arco-design/web-react/es/Input';

const { TextArea } = Input;

export interface SmartTextAreaProps extends Omit<TextAreaProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  enableCompletion?: boolean;
}

export interface SmartTextAreaRef {
  insertAtCursor: (text: string) => void;
  focus: () => void;
}

/**
 * 智能文本输入组件
 * 
 * 支持大模型自动补全，两种交互模式：
 * 1. 实时预览模式：输入时自动显示灰色补全，Tab 接受
 * 2. Tab 触发模式：按 Tab 触发显示补全，Enter 接受
 */
export const SmartTextArea = forwardRef<SmartTextAreaRef, SmartTextAreaProps>(
  ({ value, onChange, enableCompletion = true, style, ...rest }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<RefTextAreaType>(null);
    const [textareaHeight, setTextareaHeight] = useState<number>(0);
    
    const {
      config,
      state,
      triggerCompletion,
      handleTabTrigger,
      acceptCompletion,
      dismissCompletion,
    } = useCompletion();

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      insertAtCursor: (text: string) => {
        const textarea = textareaRef.current?.dom;
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.slice(0, start) + text + value.slice(end);
        
        onChange(newValue);
        
        // 设置光标位置到插入文本之后
        setTimeout(() => {
          const newPos = start + text.length;
          textarea.setSelectionRange(newPos, newPos);
          textarea.focus();
        }, 0);
      },
      focus: () => {
        textareaRef.current?.dom?.focus();
      },
    }), [value, onChange]);

    // 获取光标位置前的文本作为前缀
    const getPrefix = useCallback(() => {
      const textarea = textareaRef.current?.dom;
      if (!textarea) return '';
      const cursorPos = textarea.selectionStart;
      return value.slice(0, cursorPos);
    }, [value]);

    // 处理输入变化
    const handleChange = useCallback((newValue: string) => {
      onChange(newValue);
      
      if (enableCompletion && config.enabled) {
        const prefix = getPrefix();
        triggerCompletion(prefix, newValue);
      }
    }, [enableCompletion, config.enabled, onChange, triggerCompletion, getPrefix]);

    // 处理按键
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab 键处理
      if (e.key === 'Tab') {
        const shouldAccept = handleTabTrigger(getPrefix(), value);
        
        if (shouldAccept && state.isVisible && state.suggestion) {
          e.preventDefault();
          const suggestion = acceptCompletion();
          const textarea = textareaRef.current?.dom;
          if (textarea) {
            const cursorPos = textarea.selectionStart;
            const newValue = value.slice(0, cursorPos) + suggestion + value.slice(textarea.selectionEnd);
            onChange(newValue);
            
            // 设置光标位置到补全后
            setTimeout(() => {
              const newPos = cursorPos + suggestion.length;
              textarea.setSelectionRange(newPos, newPos);
              textarea.focus();
            }, 0);
          }
          return;
        }
        
        // 如果处于 Tab 触发模式且未显示补全，阻止默认 Tab 行为
        if (config.require_confirm && !state.isVisible) {
          e.preventDefault();
        }
      }
      
      // Enter 键处理（仅在 Tab 触发模式下用于接受补全）
      if (e.key === 'Enter' && config.require_confirm && state.isVisible && state.suggestion) {
        // 在 Tab 触发模式下，Enter 接受补全
        e.preventDefault();
        const suggestion = acceptCompletion();
        const textarea = textareaRef.current?.dom;
        if (textarea) {
          const cursorPos = textarea.selectionStart;
          const newValue = value.slice(0, cursorPos) + suggestion + value.slice(textarea.selectionEnd);
          onChange(newValue);
          
          setTimeout(() => {
            const newPos = cursorPos + suggestion.length;
            textarea.setSelectionRange(newPos, newPos);
            textarea.focus();
          }, 0);
        }
        return;
      }
      
      // Escape 取消补全
      if (e.key === 'Escape' && state.isVisible) {
        dismissCompletion();
        return;
      }
      
      // 其他按键隐藏补全
      if (state.isVisible && !['Tab', 'Enter', 'Escape'].includes(e.key)) {
        dismissCompletion();
      }
      
      rest.onKeyDown?.(e);
    }, [value, onChange, config.require_confirm, state.isVisible, state.suggestion, handleTabTrigger, acceptCompletion, dismissCompletion, getPrefix, rest]);

    // 更新 textarea 高度
    useEffect(() => {
      const textarea = textareaRef.current?.dom;
      if (textarea) {
        setTextareaHeight(textarea.scrollHeight);
      }
    }, [value]);

    // 计算幽灵文本的显示内容
    const ghostText = state.isVisible ? state.suggestion : '';
    
    // 计算光标位置
    const getCursorOffset = () => {
      const textarea = textareaRef.current?.dom;
      if (!textarea) return { top: 0, left: 0 };
      
      // 创建临时元素计算位置
      const computedStyle = window.getComputedStyle(textarea);
      const span = document.createElement('span');
      span.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: pre-wrap;
        word-wrap: break-word;
        font: ${computedStyle.font};
        padding: ${computedStyle.padding};
        border: ${computedStyle.border};
        width: ${textarea.clientWidth}px;
        line-height: ${computedStyle.lineHeight};
      `;
      
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      span.textContent = textBeforeCursor;
      
      document.body.appendChild(span);
      
      // 计算行高
      const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.5;
      
      // 计算行数
      const lines = textBeforeCursor.split('\n');
      const currentLineIndex = lines.length - 1;
      const currentLineText = lines[currentLineIndex];
      
      // 创建临时 span 计算当前行的宽度
      const lineSpan = document.createElement('span');
      lineSpan.style.cssText = span.style.cssText;
      lineSpan.textContent = currentLineText;
      document.body.appendChild(lineSpan);
      
      const left = lineSpan.getBoundingClientRect().width % textarea.clientWidth;
      const top = currentLineIndex * lineHeight;
      
      document.body.removeChild(span);
      document.body.removeChild(lineSpan);
      
      return { top, left };
    };

    return (
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          ...style,
        }}
      >
        {/* 实际 textarea */}
        <TextArea
          {...rest}
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{
            ...style,
            position: 'relative',
            zIndex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
          }}
        />
        
        {/* 幽灵文本层 */}
        {enableCompletion && config.enabled && ghostText && !state.isLoading && (
          <GhostTextLayer
            text={ghostText}
            textarea={textareaRef.current?.dom || null}
            value={value}
          />
        )}
        
        {/* 加载指示器 */}
        {state.isLoading && (
          <div
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              zIndex: 10,
              background: 'var(--color-bg-1)',
              borderRadius: '50%',
              padding: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Spin size={16} />
          </div>
        )}
      </div>
    );
  }
);

SmartTextArea.displayName = 'SmartTextArea';

/**
 * 幽灵文本层组件
 * 在 textarea 上方显示灰色的补全建议
 */
interface GhostTextLayerProps {
  text: string;
  textarea: HTMLTextAreaElement | null;
  value: string;
}

const GhostTextLayer: React.FC<GhostTextLayerProps> = ({ text, textarea, value }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ghostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!textarea) return;
    
    const updatePosition = () => {
      const computedStyle = window.getComputedStyle(textarea);
      const rect = textarea.getBoundingClientRect();
      const scrollTop = textarea.scrollTop;
      const scrollLeft = textarea.scrollLeft;
      
      // 获取光标位置
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      
      // 创建测量元素
      const measureDiv = document.createElement('div');
      measureDiv.style.cssText = `
        position: fixed;
        visibility: hidden;
        white-space: pre;
        font: ${computedStyle.font};
        padding: 0;
        border: none;
        letter-spacing: ${computedStyle.letterSpacing};
      `;
      measureDiv.textContent = currentLine;
      document.body.appendChild(measureDiv);
      
      const textWidth = measureDiv.getBoundingClientRect().width;
      document.body.removeChild(measureDiv);
      
      // 计算行高
      const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.5;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      
      // 计算位置
      const top = rect.top + paddingTop + (lines.length - 1) * lineHeight - scrollTop;
      const left = rect.left + paddingLeft + textWidth - scrollLeft;
      
      setPosition({ top, left });
    };

    updatePosition();
    
    // 监听滚动和输入事件更新位置
    textarea.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      textarea.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [textarea, value, text]);

  if (!text) return null;

  return (
    <div
      ref={ghostRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1000,
        pointerEvents: 'none',
        color: 'var(--color-text-4)',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: 'inherit',
        whiteSpace: 'pre',
        opacity: 0.6,
      }}
    >
      {text}
    </div>
  );
};

export default SmartTextArea;
