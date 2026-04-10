'use client';

interface Token {
  id: string;
  label: string;
}

interface SearchInputTokensProps {
  value: string;
  tokens: Token[];
  onValueChange: (value: string) => void;
  onTokenRemove: (id: string) => void;
  onSubmit: (query: string) => void;
  autoFocus?: boolean;
}

export function SearchInputTokens({
  value,
  tokens,
  onValueChange,
  onTokenRemove,
  onSubmit,
  autoFocus,
}: SearchInputTokensProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() && tokens.length === 0) return;
    onSubmit(value.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value && tokens.length > 0) {
      const lastTokenId = tokens.at(-1)?.id;
      if (lastTokenId) onTokenRemove(lastTokenId);
    }
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="relative flex items-center rounded-full border border-gray-200 bg-white px-3 focus-within:ring-2 focus-within:ring-[#E06B3F]">
      <span className="pointer-events-none text-[#E06B3F] mr-2">
        <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} role="img" aria-label="search">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </span>
      <div className="flex flex-1 flex-wrap items-center gap-1 min-h-[48px] py-1">
        {tokens.map((token) => (
          <span key={token.id} className="flex items-center gap-1 rounded-full bg-[#2c1810] px-2 py-0.5 text-xs text-white">
            {token.label}
            <button
              type="button"
              onClick={() => onTokenRemove(token.id)}
              aria-label={`remove ${token.label}`}
              className="ml-0.5 opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tokens.length === 0 ? '找間有巴斯克蛋糕的咖啡廳…' : '繼續輸入…'}
          autoFocus={autoFocus}
          className="min-w-[120px] flex-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
        />
      </div>
    </form>
  );
}
