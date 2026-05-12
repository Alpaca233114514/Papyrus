import { useState, useRef, useCallback, useEffect } from 'react';
import { Input, Spin, Empty, Tag, Typography } from '@arco-design/web-react';
import { IconSearch, IconFile, IconBook } from '@arco-design/web-react/icon';
import { api, type SearchResult } from './api';
import { useShortcuts } from './hooks/useShortcuts';

interface SearchBoxProps {
  onResultClick?: (result: SearchResult) => void;
  onNavigateToNote?: (noteId: string) => void;
  onNavigateToCard?: () => void;
}

const { Text } = Typography;

const SearchBox = ({ onResultClick, onNavigateToNote, onNavigateToCard }: SearchBoxProps) => {
  const { getShortcutDisplay } = useShortcuts();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<any>(null);
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
        <span key={i} className="tw-bg-primary-light tw-font-medium">
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
      return <IconFile className="tw-text-base tw-text-arco-text-2" />;
    }
    return <IconBook className="tw-text-base tw-text-arco-text-2" />;
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
    <div ref={containerRef} className="tw-relative tw-w-full">
      <Input
        ref={inputRef}
        placeholder={`搜索 (${getShortcutDisplay('search')})`}
        prefix={<IconSearch aria-hidden="true" />}
        size="small"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query.trim()) {
            setIsOpen(true);
          }
        }}
        
        className="titlebar-search-input"
        allowClear
        aria-label={`搜索笔记和卡片，按 ${getShortcutDisplay('search')} 快速聚焦`}
        aria-autocomplete="list"
        aria-controls={isOpen ? 'search-results-listbox' : undefined}
        aria-expanded={isOpen}
        aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
      />

      {/* 搜索结果下拉菜单 */}
      <div
        id="search-results-listbox"
        role="listbox"
        aria-label="搜索结果"
        className={`tw-absolute tw-left-0 tw-right-0 tw-z-50 tw-overflow-hidden tw-bg-arco-bg-popup tw-rounded-arco-lg tw-border tw-border-arco-border-2 no-drag ${
          isOpen ? 'search-dropdown-enter' : 'search-dropdown-leave'
        }`}
        style={{
          top: 'calc(100% + 8px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          minWidth: '360px',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
          <div style={{ minHeight: '200px', maxHeight: '400px', overflow: 'auto' }}>
            {/* 加载状态 */}
            {isLoading && (
              <div className="tw-flex tw-items-center tw-justify-center" style={{ height: '180px' }}>
                <Spin size={32} />
              </div>
            )}

            {/* 空状态 */}
            {!isLoading && query.trim() && results.length === 0 && (
              <div className="tw-flex tw-items-center tw-justify-center" style={{ height: '180px' }}>
                <Empty description="未找到相关结果" />
              </div>
            )}

            {/* 初始状态 */}
            {!isLoading && !query.trim() && (
              <div className="tw-p-6">
                <Text type="secondary" className="tw-text-sm">
                  输入关键词搜索笔记和卡片...
                </Text>
                <div className="tw-mt-4 tw-flex tw-gap-2 tw-flex-wrap">
                  <Tag size="small" className="tw-text-xs">↑↓ 导航</Tag>
                  <Tag size="small" className="tw-text-xs">↵ 选择</Tag>
                  <Tag size="small" className="tw-text-xs">Esc 关闭</Tag>
                </div>
              </div>
            )}

            {/* 搜索结果列表 */}
            {!isLoading && results.length > 0 && (
              <div>
                {/* 统计信息 */}
                <div className="tw-px-4 tw-py-2.5 tw-border-b tw-border-arco-border-2 tw-flex tw-justify-between tw-items-center">
                  <Text type="secondary" className="tw-text-xs">
                    找到 {results.length} 个结果
                  </Text>
                  <div className="tw-flex tw-gap-2">
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
                    id={`search-result-${index}`}
                    role="option"
                    aria-selected={selectedIndex === index}
                    onClick={() => handleResultClick(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`tw-px-4 tw-py-3 tw-cursor-pointer tw-transition-colors tw-duration-150 tw-flex tw-items-start tw-gap-3 ${
                      selectedIndex === index ? 'tw-bg-arco-fill-2' : 'tw-bg-transparent'
                    }`}
                    style={{
                      borderBottom: '1px solid var(--color-border-1)',
                    }}
                  >
                    {/* 图标 */}
                    <div className="tw-mt-1 tw-flex-shrink-0">
                      {getTypeIcon(result.type)}
                    </div>

                    {/* 内容 */}
                    <div className="tw-flex-1 tw-min-w-0">
                      {/* 标题行 */}
                      <div className="tw-flex tw-items-center tw-gap-2 tw-mb-2">
                        <Text className="tw-font-medium tw-text-sm tw-truncate">
                          {highlightMatch(result.title, query)}
                        </Text>
                        <Tag size="small" color="gray">
                          {getMatchedFieldLabel(result.matched_field)}
                        </Tag>
                      </div>

                      {/* 预览 */}
                      <Text
                        type="secondary"
                        className="tw-text-sm tw-truncate tw-block"
                      >
                        {highlightMatch(result.preview, query)}
                      </Text>

                      {/* 标签和文件夹 */}
                      <div className="tw-flex tw-items-center tw-gap-2 tw-mt-2">
                        {result.folder && (
                          <Text type="secondary" className="tw-text-xs">
                            📁 {result.folder}
                          </Text>
                        )}
                        {result.tags && result.tags.length > 0 && (
                          <div className="tw-flex tw-gap-1">
                            {result.tags.slice(0, 3).map(tag => (
                              <Tag key={tag} size="small" color="arcoblue" className="tw-text-xs">
                                {tag}
                              </Tag>
                            ))}
                            {result.tags.length > 3 && (
                              <Tag size="small" color="gray" className="tw-text-xs">
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
        </div>
    </div>
  );
};

export default SearchBox;
