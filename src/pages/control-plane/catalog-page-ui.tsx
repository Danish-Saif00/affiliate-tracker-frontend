import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MaterialIcon } from '../../components/icons/material-icon';
export function CatalogToolbar({
  search,
  onSearch,
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className="catalog-toolbar">
      <label className="catalog-search">
        <MaterialIcon name="search" />
        <input
          aria-label="Search records"
          onChange={(event) => onSearch(event.currentTarget.value)}
          placeholder="Search records"
          value={search}
        />
      </label>
      <div className="catalog-toolbar__filters">{children}</div>
    </div>
  );
}
export function CatalogPagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) {
    return null;
  }
  return (
    <nav aria-label="Pagination" className="catalog-pagination">
      <button
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        type="button"
      >
        <MaterialIcon name="chevron_left" />
      </button>
      <span>
        Page <strong>{page}</strong> of <strong>{pageCount}</strong>
      </span>
      <button
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onPage(page + 1)}
        type="button"
      >
        <MaterialIcon name="chevron_right" />
      </button>
    </nav>
  );
}
export function ToggleField({
  checked,
  label,
  hint,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: string;
  hint?: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="catalog-toggle-field">
      <span>
        <strong>{label}</strong>
        {hint !== undefined && <small>{hint}</small>}
      </span>
      <input
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
      <i aria-hidden="true" />
    </label>
  );
}
export function CheckboxGrid({
  legend,
  options,
  values,
  onChange,
}: {
  legend: string;
  options: readonly (readonly [string | number, string])[];
  values: readonly (string | number)[];
  onChange: (values: readonly (string | number)[]) => void;
}) {
  return (
    <fieldset className="catalog-checkbox-fieldset">
      <legend>{legend}</legend>
      <div className="catalog-checkbox-grid">
        {options.map(([value, label]) => {
          const selected = values.includes(value);
          return (
            <label
              className={selected ? 'catalog-chip catalog-chip--selected' : 'catalog-chip'}
              key={value}
            >
              <input
                checked={selected}
                onChange={() =>
                  onChange(
                    selected
                      ? values.filter((item) => item !== value)
                      : [...values, value],
                  )
                }
                type="checkbox"
              />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
export function MultiSelectDropdown({
  ariaLabel,
  disabled = false,
  emptyMessage = 'No matching options found.',
  options,
  placeholder,
  searchPlaceholder = 'Search options',
  values,
  onChange,
}: {
  ariaLabel: string;
  disabled?: boolean;
  emptyMessage?: string;
  options: readonly (readonly [string, string])[];
  placeholder: string;
  searchPlaceholder?: string;
  values: readonly string[];
  onChange: (values: readonly string[]) => void;
}) {
  const rootReference = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return options;
    }
    return options.filter(([value, label]) =>
      `${value} ${label}`.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);
  const selectedLabels = options
    .filter(([value]) => values.includes(value))
    .map(([, label]) => label);
  const allSelected =
    options.length > 0 &&
    options.every(([value]) => values.includes(value));
  let summary = placeholder;
  if (selectedLabels.length === 1) {
    summary = selectedLabels[0] ?? placeholder;
  } else if (selectedLabels.length === 2) {
    summary = selectedLabels.join(', ');
  } else if (selectedLabels.length > 2) {
    summary = `${selectedLabels.slice(0, 2).join(', ')} +${selectedLabels.length - 2}`;
  } else if (values.length > 0) {
    summary = `${values.length} selected`;
  }
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function handleOutsideClick(event: MouseEvent): void {
      if (
        event.target instanceof Node &&
        rootReference.current !== null &&
        !rootReference.current.contains(event.target)
      ) {
        setOpen(false);
        setQuery('');
      }
    }
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);
  function toggleValue(value: string): void {
    onChange(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  }
  return (
    <div className="catalog-multi-select" ref={rootReference}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={
          open
            ? 'catalog-multi-select__trigger catalog-multi-select__trigger--open'
            : 'catalog-multi-select__trigger'
        }
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current);
          if (open) {
            setQuery('');
          }
        }}
        type="button"
      >
        <span
          className={
            values.length === 0
              ? 'catalog-multi-select__value catalog-multi-select__value--placeholder'
              : 'catalog-multi-select__value'
          }
        >
          {summary}
        </span>
        <MaterialIcon name={open ? 'expand_less' : 'expand_more'} />
      </button>
      {open && (
        <div className="catalog-multi-select__menu">
          <label className="catalog-multi-select__search">
            <MaterialIcon
              className="catalog-multi-select__search-icon"
              name="search"
            />
            <input
              aria-label={searchPlaceholder}
              autoFocus
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={searchPlaceholder}
              type="search"
              value={query}
            />
          </label>
          <div
            aria-label={ariaLabel}
            aria-multiselectable="true"
            className="catalog-multi-select__options"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <div className="catalog-multi-select__empty">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(([value, label]) => {
                const selected = values.includes(value);
                return (
                  <button
                    aria-selected={selected}
                    className={
                      selected
                        ? 'catalog-multi-select__option catalog-multi-select__option--selected'
                        : 'catalog-multi-select__option'
                    }
                    key={value}
                    onClick={() => toggleValue(value)}
                    role="option"
                    type="button"
                  >
                    <MaterialIcon
                      name={selected ? 'check_box' : 'check_box_outline_blank'}
                    />
                    <span>{label}</span>
                  </button>
                );
              })
            )}
          </div>
          <div className="catalog-multi-select__footer">
            <span>
              {values.length === 0
                ? 'Nothing selected'
                : `${values.length} selected`}
            </span>
            <div>
              <button
                disabled={disabled || options.length === 0 || allSelected}
                onClick={() => onChange(options.map(([value]) => value))}
                type="button"
              >
                Select all
              </button>
              <button
                disabled={disabled || values.length === 0}
                onClick={() => onChange([])}
                type="button"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="catalog-row-actions">{children}</div>;
}
