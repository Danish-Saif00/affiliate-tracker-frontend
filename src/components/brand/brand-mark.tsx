import { MaterialIcon } from '../icons/material-icon';

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={`brand-mark ${compact ? 'brand-mark--compact' : ''}`}>
      <div className="brand-mark__icon" aria-hidden="true">
        <MaterialIcon name="analytics" filled />
      </div>

      {!compact && (
        <div className="brand-mark__copy">
          <strong>Publisher Tracker</strong>
          <span>Performance Command Center</span>
        </div>
      )}
    </div>
  );
}
