/**
 * AccessibilityFirstDesign - Implements accessibility-first design with screen reader announcements
 * This system ensures all UI components are accessible by default with proper ARIA attributes
 * and screen reader support.
 */
import React, { createContext, useContext, useMemo } from "react";
import { 
  useAccessibilityContext,
  useAnnouncer,
  useAriaAttributes, 
  useFocusManager,
  useHighContrast,
  useKeyboardNavigation,
  useLandmarkNavigation,
  useReducedMotion,
  useSkipLinks
} from "../framework/AccessibilityFramework";

// Accessibility-first design system interface
export interface AccessibilityFirstDesignContextType {
  // Semantic elements
  Heading: React.FC<HeadingProps>;
  Paragraph: React.FC<ParagraphProps>;
  Link: React.FC<LinkProps>;
  Button: React.FC<ButtonProps>;
  Input: React.FC<InputProps>;
  Select: React.FC<SelectProps>;
  Checkbox: React.FC<CheckboxProps>;
  Radio: React.FC<RadioProps>;
  TextArea: React.FC<TextAreaProps>;
  Label: React.FC<LabelProps>;
  List: React.FC<ListProps>;
  ListItem: React.FC<ListItemProps>;
  Table: React.FC<TableProps>;
  TableRow: React.FC<TableRowProps>;
  TableCell: React.FC<TableCellProps>;
  Form: React.FC<FormProps>;
  Fieldset: React.FC<FieldsetProps>;
  Legend: React.FC<LegendProps>;
  Dialog: React.FC<DialogProps>;
  Alert: React.FC<AlertProps>;
  ProgressBar: React.FC<ProgressBarProps>;
  Slider: React.FC<SliderProps>;
  Tabs: React.FC<TabsProps>;
  Tab: React.FC<TabProps>;
  TabPanel: React.FC<TabPanelProps>;
  Tree: React.FC<TreeProps>;
  TreeItem: React.FC<TreeItemProps>;
  Grid: React.FC<GridProps>;
  Row: React.FC<RowProps>;
  Cell: React.FC<CellProps>;
  Navigation: React.FC<NavigationProps>;
  Main: React.FC<MainProps>;
  Banner: React.FC<BannerProps>;
  ContentInfo: React.FC<ContentInfoProps>;
  Search: React.FC<SearchProps>;
  Complementary: React.FC<ComplementaryProps>;
  Region: React.FC<RegionProps>;
  Article: React.FC<ArticleProps>;
  
  // Accessibility hooks
  useAccessibility: () => ReturnType<typeof useAccessibilityContext>;
  useAnnouncer: () => ReturnType<typeof useAnnouncer>;
  useFocusManager: () => ReturnType<typeof useFocusManager>;
  useKeyboardNavigation: () => ReturnType<typeof useKeyboardNavigation>;
  useHighContrast: () => ReturnType<typeof useHighContrast>;
  useReducedMotion: () => ReturnType<typeof useReducedMotion>;
  useSkipLinks: () => ReturnType<typeof useSkipLinks>;
  useLandmarkNavigation: () => ReturnType<typeof useLandmarkNavigation>;
  useAriaAttributes: () => ReturnType<typeof useAriaAttributes>;
  
  // Utility functions
  announce: (message: string, priority?: "polite" | "assertive" | "off", options?: AnnouncementOptions) => void;
  announceAction: (action: string, status?: "started" | "completed" | "failed") => void;
  announceProgress: (progress: number, total: number, message?: string) => void;
  announceError: (error: string, context?: string) => void;
  announceSuccess: (message: string) => void;
  announceWarning: (message: string) => void;
  announceInfo: (message: string) => void;
  
  // Focus management
  focusNext: () => void;
  focusPrevious: () => void;
  focusFirst: () => void;
  focusLast: () => void;
  trapFocus: (container: HTMLElement) => (() => void) | undefined;
  
  // Keyboard navigation
  enableKeyboardNavigation: () => void;
  disableKeyboardNavigation: () => void;
  isKeyboardNavigationEnabled: boolean;
  
  // High contrast mode
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  
  // Reduced motion
  isReducedMotion: boolean;
  toggleReducedMotion: () => void;
  
  // Skip links
  skipToMainContent: () => void;
  skipToSearch: () => void;
  skipToNavigation: () => void;
  
  // Landmark navigation
  goToLandmark: (landmark: LandmarkType) => void;
  
  // ARIA attributes
  getAriaAttributes: (element: ElementType) => React.AriaAttributes;
}

// Component props interfaces
interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface ParagraphProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  announce?: boolean;
  announceText?: string;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "info" | "ghost";
  size?: "small" | "medium" | "large";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  announce?: boolean;
  announceText?: string;
  announceAction?: boolean;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  announce?: boolean;
  announceLabel?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  announce?: boolean;
  announceLabel?: boolean;
}

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  announce?: boolean;
  announceLabel?: boolean;
}

interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  announce?: boolean;
  announceLabel?: boolean;
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  announce?: boolean;
  announceLabel?: boolean;
}

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  htmlFor: string;
  required?: boolean;
  announce?: boolean;
}

interface ListProps {
  children: React.ReactNode;
  ordered?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface ListItemProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface TableProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  caption?: string;
  announce?: boolean;
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface TableCellProps {
  children: React.ReactNode;
  header?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  announce?: boolean;
  announceSubmit?: boolean;
}

interface FieldsetProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  children: React.ReactNode;
  legend?: string;
  announce?: boolean;
}

interface LegendProps extends React.HTMLAttributes<HTMLLegendElement> {
  children: React.ReactNode;
  announce?: boolean;
}

interface DialogProps {
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
  announceOpen?: boolean;
  announceClose?: boolean;
}

interface AlertProps {
  children: React.ReactNode;
  type: "info" | "success" | "warning" | "error";
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
  announceText?: string;
}

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
  announceProgress?: boolean;
  announceFrequency?: "always" | "changes" | "milestones";
}

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  announce?: boolean;
  announceLabel?: boolean;
  announceValue?: boolean;
}

interface TabsProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface TabProps {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
  announceSelect?: boolean;
}

interface TabPanelProps {
  children: React.ReactNode;
  selected: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface TreeProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface TreeItemProps {
  children: React.ReactNode;
  expanded?: boolean;
  selected?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
  announceExpand?: boolean;
  announceSelect?: boolean;
}

interface GridProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface RowProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface CellProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface NavigationProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface MainProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface BannerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface ContentInfoProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface SearchProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface ComplementaryProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface RegionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

interface ArticleProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-owns"?: string;
  announce?: boolean;
}

// Create the context with a default value
const AccessibilityFirstDesignContext = createContext<AccessibilityFirstDesignContextType | undefined>(undefined);

// Provider component props
interface AccessibilityFirstDesignProviderProps {
  children: React.ReactNode;
}

// Provider component
export const AccessibilityFirstDesignProvider: React.FC<AccessibilityFirstDesignProviderProps> = ({
  children,
}) => {
  // Get all accessibility contexts
  const _accessibilityContext = useAccessibilityContext();
  const announcer = useAnnouncer();
  const focusManager = useFocusManager();
  const keyboardNavigation = useKeyboardNavigation();
  const highContrast = useHighContrast();
  const reducedMotion = useReducedMotion();
  const skipLinks = useSkipLinks();
  const landmarkNavigation = useLandmarkNavigation();
  const ariaAttributes = useAriaAttributes();
  
  // Create semantic components with accessibility
  const Heading: React.FC<HeadingProps> = ({
    level,
    children,
    id,
    className = "",
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    
    // Announce heading if requested
    React.useEffect(() => {
      if (announce && children) {
        announcer.announce(
          typeof children === "string" ? children : "Heading",
          "polite"
        );
      }
    }, [announce, children]);
    
    return React.createElement(Tag, {
      id,
      className: `heading-${level} ${className}`,
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedBy,
      "aria-details": ariaDetails,
      "aria-owns": ariaOwns,
      children,
    });
  };
  
  const Paragraph: React.FC<ParagraphProps> = ({
    children,
    id,
    className = "",
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce paragraph if requested
    React.useEffect(() => {
      if (announce && children) {
        announcer.announce(
          typeof children === "string" ? children : "Paragraph",
          "polite"
        );
      }
    }, [announce, children]);
    
    return (
      <p
        id={id}
        className={`paragraph ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
      >
        {children}
      </p>
    );
  };
  
  const Link: React.FC<LinkProps> = ({
    href,
    children,
    external = false,
    announce = false,
    announceText,
    ...props
  }) => {
    // Announce link if requested
    React.useEffect(() => {
      if (announce && (announceText || children)) {
        announcer.announce(
          announceText || (typeof children === "string" ? children : "Link"),
          "polite"
        );
      }
    }, [announce, announceText, children]);
    
    return (
      <a
        href={href}
        {...props}
        {...ariaAttributes.getAriaAttributes("link")}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  };
  
  const Button: React.FC<ButtonProps> = ({
    children,
    variant = "primary",
    size = "medium",
    icon,
    iconPosition = "left",
    loading = false,
    announce = false,
    announceText,
    announceAction = false,
    ...props
  }) => {
    // Announce button if requested
    React.useEffect(() => {
      if (announce && (announceText || children)) {
        announcer.announce(
          announceText || (typeof children === "string" ? children : "Button"),
          "polite"
        );
      }
    }, [announce, announceText, children]);
    
    // Announce action if requested
    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (announceAction && children) {
          announcer.announceAction(
            typeof children === "string" ? children : "Button",
            "started"
          );
        }
        if (props.onClick) {
          props.onClick(e);
        }
      },
      [announceAction, children, props.onClick]
    );
    
    // Determine button classes based on variant and size
    const buttonClasses = useMemo(() => {
      const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
      
      const variantClasses = {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        success: "bg-green-600 text-white hover:bg-green-700",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600",
        info: "bg-blue-500 text-white hover:bg-blue-600",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      }[variant];
      
      const sizeClasses = {
        small: "h-8 px-3 text-xs",
        medium: "h-10 py-2 px-4 text-sm",
        large: "h-12 px-8 text-base",
      }[size];
      
      return `${baseClasses} ${variantClasses} ${sizeClasses}`;
    }, [variant, size]);
    
    return (
      <button type="button" {...props}
        {...ariaAttributes.getAriaAttributes("button")}
        className={`${buttonClasses} ${props.className || ""}`}
        onClick={handleClick}
        disabled={loading || props.disabled}
        aria-busy={loading}
      >
        {icon && iconPosition === "left" && (
          <span className="mr-2">{icon}</span>
        )}
        {loading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {children}
          </>
        ) : (
          children
        )}
        {icon && iconPosition === "right" && (
          <span className="ml-2">{icon}</span>
        )}
      </button>
    );
  };
  
  const Input: React.FC<InputProps> = ({
    label,
    helperText,
    error,
    required,
    announce = false,
    announceLabel = false,
    ...props
  }) => {
    const id = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    // Announce label if requested
    React.useEffect(() => {
      if (announceLabel && label) {
        announcer.announce(label, "polite");
      }
    }, [announceLabel, label]);
    
    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700"
            {...ariaAttributes.getAriaAttributes("label")}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          {...props}
          {...ariaAttributes.getAriaAttributes("input")}
          id={id}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
            error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
          } ${props.className || ""}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-description` : undefined}
          aria-required={required}
        />
        {helperText && !error && (
          <p id={`${id}-description`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  };
  
  const Select: React.FC<SelectProps> = ({
    label,
    helperText,
    error,
    required,
    options,
    announce = false,
    announceLabel = false,
    ...props
  }) => {
    const id = props.id || `select-${Math.random().toString(36).substr(2, 9)}`;
    
    // Announce label if requested
    React.useEffect(() => {
      if (announceLabel && label) {
        announcer.announce(label, "polite");
      }
    }, [announceLabel, label]);
    
    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700"
            {...ariaAttributes.getAriaAttributes("label")}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          {...props}
          {...ariaAttributes.getAriaAttributes("select")}
          id={id}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
            error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
          } ${props.className || ""}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-description` : undefined}
          aria-required={required}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {helperText && !error && (
          <p id={`${id}-description`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  };
  
  const Checkbox: React.FC<CheckboxProps> = ({
    label,
    helperText,
    error,
    required,
    announce = false,
    announceLabel = false,
    ...props
  }) => {
    const id = props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    
    // Announce label if requested
    React.useEffect(() => {
      if (announceLabel && label) {
        announcer.announce(label, "polite");
      }
    }, [announceLabel, label]);
    
    return (
      <div className="space-y-1">
        <div className="flex items-center">
          <input
            {...props}
            {...ariaAttributes.getAriaAttributes("checkbox")}
            id={id}
            type="checkbox"
            className={`h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ${
              error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
            } ${props.className || ""}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-description` : undefined}
            aria-required={required}
          />
          {label && (
            <label
              htmlFor={id}
              className="ml-2 block text-sm text-gray-900"
              {...ariaAttributes.getAriaAttributes("label")}
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
        </div>
        {helperText && !error && (
          <p id={`${id}-description`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  };
  
  const Radio: React.FC<RadioProps> = ({
    label,
    helperText,
    error,
    required,
    announce = false,
    announceLabel = false,
    ...props
  }) => {
    const id = props.id || `radio-${Math.random().toString(36).substr(2, 9)}`;
    
    // Announce label if requested
    React.useEffect(() => {
      if (announceLabel && label) {
        announcer.announce(label, "polite");
      }
    }, [announceLabel, label]);
    
    return (
      <div className="space-y-1">
        <div className="flex items-center">
          <input
            {...props}
            {...ariaAttributes.getAriaAttributes("radio")}
            id={id}
            type="radio"
            className={`h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 ${
              error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
            } ${props.className || ""}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-description` : undefined}
            aria-required={required}
          />
          {label && (
            <label
              htmlFor={id}
              className="ml-2 block text-sm text-gray-900"
              {...ariaAttributes.getAriaAttributes("label")}
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
        </div>
        {helperText && !error && (
          <p id={`${id}-description`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  };
  
  const TextArea: React.FC<TextAreaProps> = ({
    label,
    helperText,
    error,
    required,
    announce = false,
    announceLabel = false,
    ...props
  }) => {
    const id = props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    
    // Announce label if requested
    React.useEffect(() => {
      if (announceLabel && label) {
        announcer.announce(label, "polite");
      }
    }, [announceLabel, label]);
    
    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700"
            {...ariaAttributes.getAriaAttributes("label")}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          {...props}
          {...ariaAttributes.getAriaAttributes("textarea")}
          id={id}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
            error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
          } ${props.className || ""}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-description` : undefined}
          aria-required={required}
        />
        {helperText && !error && (
          <p id={`${id}-description`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  };
  
  const Label: React.FC<LabelProps> = ({
    children,
    htmlFor,
    required,
    announce = false,
    ...props
  }) => {
    // Announce label if requested
    React.useEffect(() => {
      if (announce && children) {
        announcer.announce(
          typeof children === "string" ? children : "Label",
          "polite"
        );
      }
    }, [announce, children]);
    
    return (
      <label
        {...props}
        {...ariaAttributes.getAriaAttributes("label")}
        htmlFor={htmlFor}
        className={`block text-sm font-medium text-gray-700 ${props.className || ""}`}
      >
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
  };
  
  const List: React.FC<ListProps> = ({
    children,
    ordered = false,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce list if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce("List", "polite");
      }
    }, [announce]);
    
    const Tag = ordered ? "ol" : "ul";
    
    return React.createElement(Tag, {
      id,
      className: `list-disc pl-5 space-y-1 ${className}`,
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedBy,
      "aria-details": ariaDetails,
      "aria-owns": ariaOwns,
      children,
    });
  };
  
  const ListItem: React.FC<ListItemProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce list item if requested
    React.useEffect(() => {
      if (announce && children) {
        announcer.announce(
          typeof children === "string" ? children : "List item",
          "polite"
        );
      }
    }, [announce, children]);
    
    return (
      <li
        id={id}
        className={className}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
      >
        {children}
      </li>
    );
  };
  
  const Table: React.FC<TableProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    caption,
    announce = false,
  }) => {
    // Announce table if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(caption || "Table", "polite");
      }
    }, [announce, caption]);
    
    return (
      <table
        id={id}
        className={`min-w-full divide-y divide-gray-200 ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
      >
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}
        {children}
      </table>
    );
  };
  
  const TableRow: React.FC<TableRowProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce table row if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce("Table row", "polite");
      }
    }, [announce]);
    
    return (
      <tr
        id={id}
        className={className}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
      >
        {children}
      </tr>
    );
  };
  
  const TableCell: React.FC<TableCellProps> = ({
    children,
    header = false,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    const Tag = header ? "th" : "td";
    
    // Announce table cell if requested
    React.useEffect(() => {
      if (announce && children) {
        announcer.announce(
          typeof children === "string" ? children : "Table cell",
          "polite"
        );
      }
    }, [announce, children]);
    
    return React.createElement(Tag, {
      id,
      className: `px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${className}`,
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedBy,
      "aria-details": ariaDetails,
      "aria-owns": ariaOwns,
      children,
    });
  };
  
  const Form: React.FC<FormProps> = ({
    children,
    announce = false,
    announceSubmit = false,
    ...props
  }) => {
    // Announce form if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce("Form", "polite");
      }
    }, [announce]);
    
    const handleSubmit = React.useCallback(
      (e: React.FormEvent<HTMLFormElement>) => {
        if (announceSubmit) {
          announcer.announceAction("Form submission", "started");
        }
        if (props.onSubmit) {
          props.onSubmit(e);
        }
      },
      [announceSubmit, props.onSubmit]
    );
    
    return (
      <form
        {...props}
        {...ariaAttributes.getAriaAttributes("form")}
        onSubmit={handleSubmit}
      >
        {children}
      </form>
    );
  };
  
  const Fieldset: React.FC<FieldsetProps> = ({
    children,
    legend,
    announce = false,
    ...props
  }) => {
    // Announce fieldset if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(legend || "Fieldset", "polite");
      }
    }, [announce, legend]);
    
    return (
      <fieldset
        {...props}
        {...ariaAttributes.getAriaAttributes("fieldset")}
        className={`space-y-4 ${props.className || ""}`}
      >
        {legend && <legend className="text-lg font-medium text-gray-900">{legend}</legend>}
        {children}
      </fieldset>
    );
  };
  
  const Legend: React.FC<LegendProps> = ({
    children,
    announce = false,
    ...props
  }) => {
    // Announce legend if requested
    React.useEffect(() => {
      if (announce && children) {
        announcer.announce(
          typeof children === "string" ? children : "Legend",
          "polite"
        );
      }
    }, [announce, children]);
    
    return (
      <legend
        {...props}
        {...ariaAttributes.getAriaAttributes("legend")}
        className={`text-lg font-medium text-gray-900 ${props.className || ""}`}
      >
        {children}
      </legend>
    );
  };
  
  const Dialog: React.FC<DialogProps> = ({
    children,
    open,
    onClose,
    title,
    description,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
    announceOpen = false,
    announceClose = false,
  }) => {
    // Announce dialog open if requested
    React.useEffect(() => {
      if (open && announceOpen) {
        announcer.announce(title, "assertive");
      }
    }, [open, announceOpen, title]);
    
    // Announce dialog close if requested
    const handleClose = React.useCallback(() => {
      if (announceClose) {
        announcer.announce("Dialog closed", "polite");
      }
      onClose();
    }, [announceClose, onClose]);
    
    if (!open) return null;
    
    return (
      <div
        id={id}
        className="fixed inset-0 z-50 overflow-y-auto"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("dialog")}
        aria-modal="true"
        role="dialog"
      >
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            aria-hidden="true"
            onClick={handleClose}
          / role="button" tabIndex={0}>
          
          {/* Dialog panel */}
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3
                    className="text-lg leading-6 font-medium text-gray-900"
                    id={`${id}-title`}
                  >
                    {title}
                  </h3>
                  {description && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{description}</p>
                    </div>
                  )}
                  <div className="mt-4">{children}</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const Alert: React.FC<AlertProps> = ({
    children,
    type,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
    announceText,
  }) => {
    // Announce alert if requested
    React.useEffect(() => {
      if (announce && (announceText || children)) {
        const message = announceText || (
          typeof children === "string" ? children : "Alert"
        );
        announcer.announce(message, type === "error" ? "assertive" : "polite");
      }
    }, [announce, announceText, children, type]);
    
    const typeClasses = {
      info: "bg-blue-50 border-blue-200 text-blue-800",
      success: "bg-green-50 border-green-200 text-green-800",
      warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
      error: "bg-red-50 border-red-200 text-red-800",
    }[type];
    
    const icon = {
      info: (
        <svg
          className="h-5 w-5 text-blue-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
      success: (
        <svg
          className="h-5 w-5 text-green-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      warning: (
        <svg
          className="h-5 w-5 text-yellow-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
      error: (
        <svg
          className="h-5 w-5 text-red-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
    }[type];
    
    return (
      <div
        id={id}
        className={`rounded-md border p-4 ${typeClasses} ${className}`}
        role="alert"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
      >
        <div className="flex">
          <div className="flex-shrink-0">{icon}</div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">{children}</h3>
          </div>
        </div>
      </div>
    );
  };
  
  const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    max = 100,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
    announceProgress = false,
    announceFrequency = "changes",
  }) => {
    const [lastAnnouncedValue, setLastAnnouncedValue] = useState<number>(0);
    
    // Announce progress if requested
    React.useEffect(() => {
      if (announceProgress) {
        const shouldAnnounce = 
          announceFrequency === "always" ||
          (announceFrequency === "changes" && value !== lastAnnouncedValue) ||
          (announceFrequency === "milestones" && value % 10 === 0 && value !== lastAnnouncedValue);
        
        if (shouldAnnounce) {
          announcer.announceProgress(value, max, ariaLabel);
          setLastAnnouncedValue(value);
        }
      }
    }, [value, max, announceProgress, announceFrequency, lastAnnouncedValue, ariaLabel, setLastAnnouncedValue]);
    
    const percentage = Math.round((value / max) * 100);
    
    return (
      <div
        id={id}
        className={`space-y-2 ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("progressbar")}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className="flex justify-between text-sm text-gray-600">
          <span>{ariaLabel || "Progress"}</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };
  
  const Slider: React.FC<SliderProps> = ({
    label,
    helperText,
    error,
    min = 0,
    max = 100,
    step = 1,
    value,
    onChange,
    announce = false,
    announceLabel = false,
    announceValue = false,
    ...props
  }) => {
    const id = props.id || `slider-${Math.random().toString(36).substr(2, 9)}`;
    
    // Announce label if requested
    React.useEffect(() => {
      if (announceLabel && label) {
        announcer.announce(label, "polite");
      }
    }, [announceLabel, label]);
    
    // Announce value if requested
    React.useEffect(() => {
      if (announceValue) {
        announcer.announce(`${label || "Slider"}: ${value}`, "polite");
      }
    }, [value, announceValue, label]);
    
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(Number(e.target.value));
      },
      [onChange]
    );
    
    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700"
            {...ariaAttributes.getAriaAttributes("label")}
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          {...props}
          {...ariaAttributes.getAriaAttributes("slider")}
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${
            error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
          } ${props.className || ""}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-description` : undefined}
          aria-required={props.required}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>{min}</span>
          <span>{value}</span>
          <span>{max}</span>
        </div>
        {helperText && !error && (
          <p id={`${id}-description`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  };
  
  const Tabs: React.FC<TabsProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce tabs if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(ariaLabel || "Tabs", "polite");
      }
    }, [announce, ariaLabel]);
    
    return (
      <div
        id={id}
        className={`space-y-4 ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("tablist")}
        role="tablist"
      >
        {children}
      </div>
    );
  };
  
  const Tab: React.FC<TabProps> = ({
    children,
    selected,
    onClick,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
    announceSelect = false,
  }) => {
    // Announce tab selection if requested
    React.useEffect(() => {
      if (announceSelect && selected && children) {
        announcer.announce(
          `Selected tab: ${typeof children === "string" ? children : "Tab"}`,
          "polite"
        );
      }
    }, [announceSelect, selected, children]);
    
    return (
      <button type="button" id={id}
        className={`px-4 py-2 text-sm font-medium rounded-md ${
          selected
            ? "bg-indigo-100 text-indigo-700"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        } ${className}`}
        role="tab"
        aria-selected={selected}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("tab")}
        onClick={onClick}
        tabIndex={selected ? 0 : -1}
      >
        {children}
      </button>
    );
  };
  
  const TabPanel: React.FC<TabPanelProps> = ({
    children,
    selected,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce tab panel if requested
    React.useEffect(() => {
      if (announce && selected) {
        announcer.announce(ariaLabel || "Tab panel", "polite");
      }
    }, [announce, selected, ariaLabel]);
    
    return (
      <div
        id={id}
        className={`mt-4 ${className} ${!selected ? "hidden" : ""}`}
        role="tabpanel"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("tabpanel")}
        hidden={!selected}
      >
        {children}
      </div>
    );
  };
  
  const Tree: React.FC<TreeProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce tree if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(ariaLabel || "Tree", "polite");
      }
    }, [announce, ariaLabel]);
    
    return (
      <div
        id={id}
        className={`space-y-1 ${className}`}
        role="tree"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("tree")}
      >
        {children}
      </div>
    );
  };
  
  const TreeItem: React.FC<TreeItemProps> = ({
    children,
    expanded = false,
    selected = false,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
    announceExpand = false,
    announceSelect = false,
  }) => {
    // Announce expansion if requested
    React.useEffect(() => {
      if (announceExpand && children) {
        announcer.announce(
          `${typeof children === "string" ? children : "Tree item"} ${
            expanded ? "expanded" : "collapsed"
          }`,
          "polite"
        );
      }
    }, [announceExpand, expanded, children]);
    
    // Announce selection if requested
    React.useEffect(() => {
      if (announceSelect && selected && children) {
        announcer.announce(
          `Selected: ${typeof children === "string" ? children : "Tree item"}`,
          "polite"
        );
      }
    }, [announceSelect, selected, children]);
    
    return (
      <div
        id={id}
        className={`flex items-center ${className}`}
        role="treeitem"
        aria-expanded={expanded}
        aria-selected={selected}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("treeitem")}
      >
        {children}
      </div>
    );
  };
  
  const Grid: React.FC<GridProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce grid if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(ariaLabel || "Grid", "polite");
      }
    }, [announce, ariaLabel]);
    
    return (
      <div
        id={id}
        className={`grid ${className}`}
        role="grid"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("grid")}
      >
        {children}
      </div>
    );
  };
  
  const Row: React.FC<RowProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce row if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(ariaLabel || "Row", "polite");
      }
    }, [announce, ariaLabel]);
    
    return (
      <div
        id={id}
        className={`grid grid-cols-subgrid col-span-full ${className}`}
        role="row"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("row")}
      >
        {children}
      </div>
    );
  };
  
  const Cell: React.FC<CellProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce cell if requested
    React.useEffect(() => {
      if (announce && children) {
        announcer.announce(
          typeof children === "string" ? children : "Cell",
          "polite"
        );
      }
    }, [announce, children]);
    
    return (
      <div
        id={id}
        className={`p-2 ${className}`}
        role="gridcell"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("cell")}
      >
        {children}
      </div>
    );
  };
  
  const Navigation: React.FC<NavigationProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce navigation if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(ariaLabel || "Navigation", "polite");
      }
    }, [announce, ariaLabel]);
    
    return (
      <nav
        id={id}
        className={`bg-white shadow ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("navigation")}
      >
        {children}
      </nav>
    );
  };
  
  const Main: React.FC<MainProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce main content if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(ariaLabel || "Main content", "polite");
      }
    }, [announce, ariaLabel]);
    
    return (
      <main
        id={id}
        className={`flex-1 ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("main")}
      >
        {children}
      </main>
    );
  };
  
  const Banner: React.FC<BannerProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce banner if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(ariaLabel || "Banner", "polite");
      }
    }, [announce, ariaLabel]);
    
    return (
      <header
        id={id}
        className={`bg-white shadow ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("banner")}
      >
        {children}
      </header>
    );
  };
  
  const ContentInfo: React.FC<ContentInfoProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce content info if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(ariaLabel || "Content information", "polite");
      }
    }, [announce, ariaLabel]);
    
    return (
      <footer
        id={id}
        className={`bg-white ${className}`}
        role="contentinfo"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("contentinfo")}
      >
        {children}
      </footer>
    );
  };
  
  const Search: React.FC<SearchProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce search if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(ariaLabel || "Search", "polite");
      }
    }, [announce, ariaLabel]);
    
    return (
      <div
        id={id}
        className={`relative rounded-md shadow-sm ${className}`}
        role="search"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("search")}
      >
        {children}
      </div>
    );
  };
  
  const Complementary: React.FC<ComplementaryProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce complementary content if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(ariaLabel || "Complementary content", "polite");
      }
    }, [announce, ariaLabel]);
    
    return (
      <aside
        id={id}
        className={`bg-white p-6 rounded-lg shadow ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("complementary")}
      >
        {children}
      </aside>
    );
  };
  
  const Region: React.FC<RegionProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce region if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(ariaLabel || "Region", "polite");
      }
    }, [announce, ariaLabel]);
    
    return (
      <section
        id={id}
        className={`bg-white p-6 rounded-lg shadow ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("region")}
      >
        {children}
      </section>
    );
  };
  
  const Article: React.FC<ArticleProps> = ({
    children,
    className = "",
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-details": ariaDetails,
    "aria-owns": ariaOwns,
    announce = false,
  }) => {
    // Announce article if requested
    React.useEffect(() => {
      if (announce) {
        announcer.announce(ariaLabel || "Article", "polite");
      }
    }, [announce, ariaLabel]);
    
    return (
      <article
        id={id}
        className={`prose max-w-none ${className}`}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-details={ariaDetails}
        aria-owns={ariaOwns}
        {...ariaAttributes.getAriaAttributes("article")}
      >
        {children}
      </article>
    );
  };
  
  // Create context value with all components and hooks
  const value = useMemo<AccessibilityFirstDesignContextType>(() => ({
    // Semantic components
    Heading,
    Paragraph,
    Link,
    Button,
    Input,
    Select,
    Checkbox,
    Radio,
    TextArea,
    Label,
    List,
    ListItem,
    Table,
    TableRow,
    TableCell,
    Form,
    Fieldset,
    Legend,
    Dialog,
    Alert,
    ProgressBar,
    Slider,
    Tabs,
    Tab,
    TabPanel,
    Tree,
    TreeItem,
    Grid,
    Row,
    Cell,
    Navigation,
    Main,
    Banner,
    ContentInfo,
    Search,
    Complementary,
    Region,
    Article,
    
    // Accessibility hooks
    useAccessibility: useAccessibilityContext,
    useAnnouncer,
    useFocusManager,
    useKeyboardNavigation,
    useHighContrast,
    useReducedMotion,
    useSkipLinks,
    useLandmarkNavigation,
    useAriaAttributes,
    
    // Utility functions
    announce: announcer.announce,
    announceAction: announcer.announceAction,
    announceProgress: announcer.announceProgress,
    announceError: announcer.announceError,
    announceSuccess: announcer.announceSuccess,
    announceWarning: announcer.announceWarning,
    announceInfo: announcer.announceInfo,
    
    // Focus management
    focusNext: focusManager.focusNext,
    focusPrevious: focusManager.focusPrevious,
    focusFirst: focusManager.focusFirst,
    focusLast: focusManager.focusLast,
    trapFocus: focusManager.trapFocus,
    
    // Keyboard navigation
    enableKeyboardNavigation: keyboardNavigation.enableKeyboardNavigation,
    disableKeyboardNavigation: keyboardNavigation.disableKeyboardNavigation,
    isKeyboardNavigationEnabled: keyboardNavigation.isKeyboardNavigationEnabled,
    
    // High contrast mode
    isHighContrast: highContrast.isHighContrast,
    toggleHighContrast: highContrast.toggleHighContrast,
    
    // Reduced motion
    isReducedMotion: reducedMotion.isReducedMotion,
    toggleReducedMotion: reducedMotion.toggleReducedMotion,
    
    // Skip links
    skipToMainContent: skipLinks.skipToMainContent,
    skipToSearch: skipLinks.skipToSearch,
    skipToNavigation: skipLinks.skipToNavigation,
    
    // Landmark navigation
    goToLandmark: landmarkNavigation.goToLandmark,
    
    // ARIA attributes
    getAriaAttributes: ariaAttributes.getAriaAttributes,
  }), [
    Heading, 
    Paragraph, 
    Link, 
    Button, 
    Input, 
    Select, 
    Checkbox, 
    Radio, 
    TextArea, 
    Label, 
    List, 
    ListItem, 
    Table, 
    TableRow, 
    TableCell, 
    Form, 
    Fieldset, 
    Legend, 
    Dialog, 
    Alert, 
    ProgressBar, 
    Slider, 
    Tabs, 
    Tab, 
    TabPanel, 
    Tree, 
    TreeItem, 
    Grid, 
    Row, 
    Cell, 
    Navigation, 
    Main, 
    Banner, 
    ContentInfo, 
    Search, 
    Complementary, 
    Region, 
    Article, 
    announcer, 
    focusManager, 
    keyboardNavigation, 
    highContrast, 
    reducedMotion, 
    skipLinks, 
    landmarkNavigation, 
    ariaAttributes
  ]);
  
  return (
    <AccessibilityFirstDesignContext.Provider value={value}>
      {children}
    </AccessibilityFirstDesignContext.Provider>
  );
};

// Hook to consume the context
export const useAccessibilityFirstDesign = (): AccessibilityFirstDesignContextType => {
  const context = useContext(AccessibilityFirstDesignContext);
  if (context === undefined) {
    throw new Error("useAccessibilityFirstDesign must be used within an AccessibilityFirstDesignProvider");
  }
  return context;
};

// Selector hooks for specific accessibility features
export const useSemanticComponents = (): Pick<
  AccessibilityFirstDesignContextType,
  | "Heading"
  | "Paragraph"
  | "Link"
  | "Button"
  | "Input"
  | "Select"
  | "Checkbox"
  | "Radio"
  | "TextArea"
  | "Label"
  | "List"
  | "ListItem"
  | "Table"
  | "TableRow"
  | "TableCell"
  | "Form"
  | "Fieldset"
  | "Legend"
  | "Dialog"
  | "Alert"
  | "ProgressBar"
  | "Slider"
  | "Tabs"
  | "Tab"
  | "TabPanel"
  | "Tree"
  | "TreeItem"
  | "Grid"
  | "Row"
  | "Cell"
  | "Navigation"
  | "Main"
  | "Banner"
  | "ContentInfo"
  | "Search"
  | "Complementary"
  | "Region"
  | "Article"
> => {
  const context = useAccessibilityFirstDesign();
  return useMemo(
    () => ({
      Heading: context.Heading,
      Paragraph: context.Paragraph,
      Link: context.Link,
      Button: context.Button,
      Input: context.Input,
      Select: context.Select,
      Checkbox: context.Checkbox,
      Radio: context.Radio,
      TextArea: context.TextArea,
      Label: context.Label,
      List: context.List,
      ListItem: context.ListItem,
      Table: context.Table,
      TableRow: context.TableRow,
      TableCell: context.TableCell,
      Form: context.Form,
      Fieldset: context.Fieldset,
      Legend: context.Legend,
      Dialog: context.Dialog,
      Alert: context.Alert,
      ProgressBar: context.ProgressBar,
      Slider: context.Slider,
      Tabs: context.Tabs,
      Tab: context.Tab,
      TabPanel: context.TabPanel,
      Tree: context.Tree,
      TreeItem: context.TreeItem,
      Grid: context.Grid,
      Row: context.Row,
      Cell: context.Cell,
      Navigation: context.Navigation,
      Main: context.Main,
      Banner: context.Banner,
      ContentInfo: context.ContentInfo,
      Search: context.Search,
      Complementary: context.Complementary,
      Region: context.Region,
      Article: context.Article,
    }),
    [
      context.Heading,
      context.Paragraph,
      context.Link,
      context.Button,
      context.Input,
      context.Select,
      context.Checkbox,
      context.Radio,
      context.TextArea,
      context.Label,
      context.List,
      context.ListItem,
      context.Table,
      context.TableRow,
      context.TableCell,
      context.Form,
      context.Fieldset,
      context.Legend,
      context.Dialog,
      context.Alert,
      context.ProgressBar,
      context.Slider,
      context.Tabs,
      context.Tab,
      context.TabPanel,
      context.Tree,
      context.TreeItem,
      context.Grid,
      context.Row,
      context.Cell,
      context.Navigation,
      context.Main,
      context.Banner,
      context.ContentInfo,
      context.Search,
      context.Complementary,
      context.Region,
      context.Article,
    ]
  );
};

export const useAccessibilityHooks = (): Pick<
  AccessibilityFirstDesignContextType,
  | "useAccessibility"
  | "useAnnouncer"
  | "useFocusManager"
  | "useKeyboardNavigation"
  | "useHighContrast"
  | "useReducedMotion"
  | "useSkipLinks"
  | "useLandmarkNavigation"
  | "useAriaAttributes"
> => {
  const context = useAccessibilityFirstDesign();
  return useMemo(
    () => ({
      useAccessibility: context.useAccessibility,
      useAnnouncer: context.useAnnouncer,
      useFocusManager: context.useFocusManager,
      useKeyboardNavigation: context.useKeyboardNavigation,
      useHighContrast: context.useHighContrast,
      useReducedMotion: context.useReducedMotion,
      useSkipLinks: context.useSkipLinks,
      useLandmarkNavigation: context.useLandmarkNavigation,
      useAriaAttributes: context.useAriaAttributes,
    }),
    [
      context.useAccessibility,
      context.useAnnouncer,
      context.useFocusManager,
      context.useKeyboardNavigation,
      context.useHighContrast,
      context.useReducedMotion,
      context.useSkipLinks,
      context.useLandmarkNavigation,
      context.useAriaAttributes,
    ]
  );
};

export const useAccessibilityUtilities = (): Pick<
  AccessibilityFirstDesignContextType,
  | "announce"
  | "announceAction"
  | "announceProgress"
  | "announceError"
  | "announceSuccess"
  | "announceWarning"
  | "announceInfo"
  | "focusNext"
  | "focusPrevious"
  | "focusFirst"
  | "focusLast"
  | "trapFocus"
  | "enableKeyboardNavigation"
  | "disableKeyboardNavigation"
  | "isKeyboardNavigationEnabled"
  | "isHighContrast"
  | "toggleHighContrast"
  | "isReducedMotion"
  | "toggleReducedMotion"
  | "skipToMainContent"
  | "skipToSearch"
  | "skipToNavigation"
  | "goToLandmark"
  | "getAriaAttributes"
> => {
  const context = useAccessibilityFirstDesign();
  return useMemo(
    () => ({
      announce: context.announce,
      announceAction: context.announceAction,
      announceProgress: context.announceProgress,
      announceError: context.announceError,
      announceSuccess: context.announceSuccess,
      announceWarning: context.announceWarning,
      announceInfo: context.announceInfo,
      focusNext: context.focusNext,
      focusPrevious: context.focusPrevious,
      focusFirst: context.focusFirst,
      focusLast: context.focusLast,
      trapFocus: context.trapFocus,
      enableKeyboardNavigation: context.enableKeyboardNavigation,
      disableKeyboardNavigation: context.disableKeyboardNavigation,
      isKeyboardNavigationEnabled: context.isKeyboardNavigationEnabled,
      isHighContrast: context.isHighContrast,
      toggleHighContrast: context.toggleHighContrast,
      isReducedMotion: context.isReducedMotion,
      toggleReducedMotion: context.toggleReducedMotion,
      skipToMainContent: context.skipToMainContent,
      skipToSearch: context.skipToSearch,
      skipToNavigation: context.skipToNavigation,
      goToLandmark: context.goToLandmark,
      getAriaAttributes: context.getAriaAttributes,
    }),
    [
      context.announce,
      context.announceAction,
      context.announceProgress,
      context.announceError,
      context.announceSuccess,
      context.announceWarning,
      context.announceInfo,
      context.focusNext,
      context.focusPrevious,
      context.focusFirst,
      context.focusLast,
      context.trapFocus,
      context.enableKeyboardNavigation,
      context.disableKeyboardNavigation,
      context.isKeyboardNavigationEnabled,
      context.isHighContrast,
      context.toggleHighContrast,
      context.isReducedMotion,
      context.toggleReducedMotion,
      context.skipToMainContent,
      context.skipToSearch,
      context.skipToNavigation,
      context.goToLandmark,
      context.getAriaAttributes,
    ]
  );
};

export default AccessibilityFirstDesignContext;