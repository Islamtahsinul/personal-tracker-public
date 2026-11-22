import {
  Car,
  Bike,
  Clapperboard,
  Tv,
  Gamepad2,
  BookOpen,
  Library,
  Camera,
  Plane,
  Watch,
  UtensilsCrossed,
  Shirt,
  Trophy,
  Music,
  Palette,
  Dumbbell,
  Crosshair,
  Leaf,
  type LucideIcon,
} from "lucide-react";

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  car: Car,
  bike: Bike,
  clapperboard: Clapperboard,
  tv: Tv,
  "gamepad-2": Gamepad2,
  "book-open": BookOpen,
  library: Library,
  camera: Camera,
  plane: Plane,
  watch: Watch,
  utensils: UtensilsCrossed,
  shirt: Shirt,
  trophy: Trophy,
  music: Music,
  palette: Palette,
  dumbbell: Dumbbell,
  crosshair: Crosshair,
  leaf: Leaf,
};

export const ICON_CHOICES = Object.keys(ICON_REGISTRY);

export function getTrackerIcon(icon: string | null | undefined): LucideIcon {
  return (icon && ICON_REGISTRY[icon]) || Library;
}

/** Renders a tracker's icon inside a tinted rounded badge. A stable component (rather than
 * resolving + rendering an icon reference inline) so it's safe to use directly in JSX. */
export function TrackerIconBadge({
  icon,
  color,
  className = "flex size-11 items-center justify-center rounded-xl",
  iconClassName = "size-5",
}: {
  icon: string | null | undefined;
  color: string;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = getTrackerIcon(icon);
  return (
    <span className={className} style={{ backgroundColor: `${color}22`, color }}>
      {/* ICON_REGISTRY is a static module-level map, so this reference is stable across renders
          despite being resolved via a function call — safe to use as a JSX tag. */}
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Icon className={iconClassName} />
    </span>
  );
}
