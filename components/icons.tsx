const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const SendIcon = () => (
  <svg {...iconProps}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const SplitIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="4" width="7" height="16" rx="1.5" />
    <rect x="14" y="4" width="7" height="16" rx="1.5" />
  </svg>
);

export const MergeIcon = () => (
  <svg {...iconProps}>
    <path d="M3 6l6 6-6 6M21 6l-6 6 6 6" />
  </svg>
);

export const PlusIcon = () => (
  <svg {...iconProps}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const TrashIcon = () => (
  <svg {...iconProps} width={12} height={12}>
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
  </svg>
);

export const DownloadIcon = () => (
  <svg {...iconProps} width={12} height={12}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

export const SearchIcon = () => (
  <svg {...iconProps} width={12} height={12}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4-4" />
  </svg>
);

export const SparkleIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </svg>
);

export const ChartIcon = () => (
  <svg {...iconProps}>
    <path d="M3 3v18h18" />
    <path d="M7 14l3-3 4 4 5-5" />
  </svg>
);

export const StopIcon = () => (
  <svg {...iconProps}>
    <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" stroke="none" />
  </svg>
);

export const PencilIcon = () => (
  <svg {...iconProps} width={12} height={12}>
    <path d="M11 4l3 3L7 14H4v-3L11 4zM14 2l2 2" />
  </svg>
);

export const EyeOffIcon = () => (
  <svg {...iconProps}>
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const GripIcon = () => (
  <svg width={10} height={14} viewBox="0 0 10 14" fill="currentColor">
    <circle cx="3" cy="2.5" r="1.2" />
    <circle cx="7" cy="2.5" r="1.2" />
    <circle cx="3" cy="7" r="1.2" />
    <circle cx="7" cy="7" r="1.2" />
    <circle cx="3" cy="11.5" r="1.2" />
    <circle cx="7" cy="11.5" r="1.2" />
  </svg>
);

export const ClipboardIcon = () => (
  <svg {...iconProps} width={12} height={12}>
    <rect x="9" y="2" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...iconProps} width={12} height={12}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const MenuIcon = () => (
  <svg {...iconProps} width={18} height={18}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const XIcon = () => (
  <svg {...iconProps} width={18} height={18}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const ChevronLeftIcon = () => (
  <svg {...iconProps} width={16} height={16}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const ChevronRightIcon = () => (
  <svg {...iconProps} width={16} height={16}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const ChevronDownIcon = () => (
  <svg {...iconProps} width={12} height={12}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
