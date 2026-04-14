import './Button.css';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}) => {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export const IconButton = ({
  children,
  icon,
  onClick,
  className = '',
  title = '',
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`icon-btn ${className}`}
      title={title}
      disabled={disabled}
    >
      {icon && <span className="icon">{icon}</span>}
      {children}
    </button>
  );
};
