import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigation, NavigationTarget } from '../../context/NavigationContext';

export interface ReturnButtonProps {
  /** Custom label, defaults to "Return" */
  label?: string;
  /** Custom fallback destination if there is no previous history entry */
  fallback?: NavigationTarget;
  /** Whether to show the previous destination title on desktop screens (e.g. "to Animals") */
  showPreviousTitle?: boolean;
  /** Visual presentation variant */
  variant?: 'header' | 'inline' | 'modal' | 'subtle' | 'compact';
  /** Extra CSS classes */
  className?: string;
  /** Optional custom click handler; if it returns false, navigation is aborted */
  onClick?: () => void | boolean;
  /** When true, hides the button if the user is on the root screen with no history */
  hideIfAtRoot?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export const ReturnButton: React.FC<ReturnButtonProps> = ({
  label = 'Return',
  fallback,
  showPreviousTitle = true,
  variant = 'header',
  className = '',
  onClick,
  hideIfAtRoot = false,
  disabled = false,
}) => {
  const { goBack, previous, current, canGoBack } = useNavigation();

  // If user is at root dashboard with no history and hideIfAtRoot is requested
  const isAtRoot = !previous && current.tab === 'dashboard' && !current.animalId;
  if (hideIfAtRoot && isAtRoot) {
    return null;
  }

  const handleReturn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    if (onClick) {
      const result = onClick();
      if (result === false) return;
      // If onClick was provided and did not explicitly return true, assume it handled the action
      if (result !== true) return;
    }

    goBack({ fallback });
  };

  // Human-readable title of previous page or fallback
  const destinationTitle = previous
    ? previous.title
    : fallback?.title || (current.animalId ? 'Cattle & Herd' : current.tab !== 'dashboard' ? 'Dashboard' : null);

  // Variant Styling
  let variantStyles = '';
  switch (variant) {
    case 'header':
      variantStyles =
        'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-2xs py-1.5 px-2.5 sm:px-3 text-xs font-semibold rounded-lg';
      break;
    case 'modal':
      variantStyles =
        'bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 py-1.5 px-3 text-xs font-semibold rounded-lg';
      break;
    case 'subtle':
      variantStyles =
        'hover:bg-slate-100 text-slate-600 hover:text-slate-900 py-1.5 px-2.5 text-xs font-semibold rounded-lg';
      break;
    case 'compact':
      variantStyles =
        'bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 px-2 text-[11px] font-semibold rounded-md border border-slate-200';
      break;
    case 'inline':
    default:
      variantStyles =
        'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 shadow-2xs py-1.5 px-3 text-xs font-semibold rounded-lg';
      break;
  }

  const tooltipText = destinationTitle
    ? `Return to ${destinationTitle}`
    : 'Return to previous page';

  return (
    <button
      type="button"
      id="global-return-button"
      onClick={handleReturn}
      disabled={disabled || (isAtRoot && !canGoBack)}
      title={tooltipText}
      aria-label={tooltipText}
      className={`group inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none shrink-0 ${variantStyles} ${className}`}
    >
      <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-slate-800 group-hover:-translate-x-0.5 transition-transform shrink-0" />
      <span className="font-semibold tracking-tight">{label}</span>
      {showPreviousTitle && destinationTitle && (
        <span className="hidden md:inline font-normal text-slate-400 group-hover:text-slate-500 truncate max-w-[130px] border-l border-slate-300 pl-1.5 ml-0.5 text-[11px]">
          {destinationTitle}
        </span>
      )}
    </button>
  );
};

export const BackButton = ReturnButton;
