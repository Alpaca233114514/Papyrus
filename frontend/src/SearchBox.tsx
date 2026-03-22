import { useState, useRef, useCallback, useEffect } from 'react';
import { Input, Spin, Empty, Tag, Typography } from '@arco-design/web-react';
import { IconSearch, IconFile, IconBook } from '@arco-design/web-react/icon';
import { api, type SearchResult } from './api';

interface SearchBoxProps {
  onResultClick?: (result: SearchResult) => void;
  onNavigateToNote?: (noteId: string) => void;
  onNavigateToCard?: () => void;
}

const { Text } = Typography;

const SearchBox = ({ onResultClick, onNavigateToNote, onNavigateToCard }: SearchBoxProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 执行搜索
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.search(searchQuery.trim());
      if (response.success) {
        setResults(response.results);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 防抖搜索
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 200);
  }, [performSearch]);

  // 输入处理
  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    if (value.trim()) {
      setIsOpen(true);
      debouncedSearch(value);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  // 点击结果
  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    
    if (onResultClick) {
      onResultClick(result);
    } else if (result.type === 'note' && onNavigateToNote) {
      onNavigateToNote(result.id);
    } else if (result.type === 'card' && onNavigateToCard) {
      onNavigateToCard();
    }
  };

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 全局键盘监听
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 高亮匹配文本
  const highlightMatch = (text: string, queryStr: string) => {
    if (!queryStr.trim()) return text;
    const regex = new RegExp(`(${queryStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <span key={i} style={{ backgroundColor: 'rgba(32, 108, 207, 0.2)', fontWeight: 500 }}>
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  // 获取图标
  const getTypeIcon = (type: string) => {
    if (type === 'note') {
      return <IconFile style={{ fontSize: 16, color: 'var(--color-text-2)' }} />;
    }
    return <IconBook style={{ fontSize: 16, color: 'var(--color-text-2)' }} />;
  };

  // 获取匹配字段显示
  const getMatchedFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      title: '标题',
      content: '内容',
      tags: '标签',
      question: '问题',
      answer: '答案',
    };
    return labels[field] || field;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <Input
        ref={inputRef}
        placeholder="搜索 (Ctrl+K)"
        prefix={<IconSearch />}
        size="small"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query.trim()) {
            setIsOpen(true);
          }
        }}
        style={{ width: '320px' }}
        allowClear
      />

      {/* 搜索结果下拉菜单 */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--color-bg-popup)',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--color-border-2)',
            maxHeight: '400px',
            overflow: 'auto',
            zIndex: 1000,
            minWidth: '360px',
          }}
        >
          {/* 加载状态 */}
          {isLoading && (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <Spin size={24} />
            </div>
          )}

          {/* 空状态 */}
          {!isLoading && query.trim() && results.length === 0 && (
            <div style={{ padding: '32px 24px' }}>
              <Empty description="未找到相关结果" />
            </div>
          )}

          {/* 初始状态 */}
          {!isLoading && !query.trim() && (
            <div style={{ padding: '24px' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                输入关键词搜索笔记和卡片...
              </Text>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Tag size="small" style={{ fontSize: '12px' }}>↑↓ 导航</Tag>
                <Tag size="small" style={{ fontSize: '12px' }}>↵ 选择</Tag>
                <Tag size="small" style={{ fontSize: '12px' }}>Esc 关闭</Tag>
              </div>
            </div>
          )}

          {/* 搜索结果列表 */}
          {!isLoading && results.length > 0 && (
            <div>
              {/* 统计信息 */}
              <div
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--color-border-2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  找到 {results.length} 个结果
                </Text>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {results.some(r => r.type === 'note') && (
                    <Tag size="small" color="arcoblue">
                      笔记 {results.filter(r => r.type === 'note').length}
                    </Tag>
                  )}
                  {results.some(r => r.type === 'card') && (
                    <Tag size="small" color="green">
                      卡片 {results.filter(r => r.type === 'card').length}
                    </Tag>
                  )}
                </div>
              </div>

              {/* 结果项 */}
              {results.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    backgroundColor: selectedIndex === index 
                      ? 'var(--color-fill-2)' 
                      : 'transparent',
                    borderBottom: '1px solid var(--color-border-1)',
                    transition: 'background-color 0.15s',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  {/* 图标 */}
                  <div style={{ 
                    marginTop: '2px',
                    flexShrink: 0,
                  }}>
                    {getTypeIcon(result.type)}
                  </div>

                  {/* 内容 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* 标题行 */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '4px',
                    }}>
                      <Text 
                        style={{ 
                          fontWeight: 500, 
                          fontSize: '14px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {highlightMatch(result.title, query)}
                      </Text>
                      <Tag size="mini" color="gray">
                        {getMatchedFieldLabel(result.matched_field)}
                      </Tag>
                    </div>

                    {/* 预览 */}
                    <Text
                      type="secondary"
                      style={{
                        fontSize: '13px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {highlightMatch(result.preview, query)}
                    </Text>

                    {/* 标签和文件夹 */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginTop: '6px',
                    }}>
                      {result.folder && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          📁 {result.folder}
                        </Text>
                      )}
                      {result.tags && result.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {result.tags.slice(0, 3).map(tag => (
                            <Tag key={tag} size="mini" color="arcoblue" style={{ fontSize: '11px' }}>
                              {tag}
                            </Tag>
                          ))}
                          {result.tags.length > 3 && (
                            <Tag size="mini" color="gray" style={{ fontSize: '11px' }}>
                              +{result.tags.length - 3}
                            </Tag>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBox;
