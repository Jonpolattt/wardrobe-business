'use client';

import { Icon } from '../icons/Icon';
import { Flag, type FlagCode } from './Flag';

export type DropdownOption<T extends string> = {
  value: T;
  flag: FlagCode;
  label: string;
  hint?: string;
};

export function Dropdown<T extends string>({
  value,
  options,
  open,
  onToggle,
  onSelect,
  ariaLabel,
  triggerText = "label",
}: {
  value: T;
  options: DropdownOption<T>[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
  ariaLabel: string;
  triggerText?: "label" | "value";
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className="dropdown" data-popover-root>
      <button
        type="button"
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel + ": " + current.label}
        title={ariaLabel}
        onClick={onToggle}
      >
        <Flag code={current.flag} />
        <span className="dropdown-label">
          {triggerText === "value" ? current.value : current.label}
        </span>
        <Icon name="chevron" size={16} className={"dropdown-chevron" + (open ? " open" : "")} />
      </button>
      {open && (
        <ul className="dropdown-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={"dropdown-option" + (selected ? " selected" : "")}
                  onClick={() => onSelect(option.value)}
                >
                  <Flag code={option.flag} />
                  <span className="dropdown-option-text">
                    {option.label}
                    {option.hint && <small>{option.hint}</small>}
                  </span>
                  {selected && <Icon name="check" size={17} className="dropdown-check" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
