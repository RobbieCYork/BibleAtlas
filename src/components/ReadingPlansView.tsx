import { READING_PLANS, formatPlanDayDisplayReference, type ReadingPlan, type ReadingPlanDay } from "../data/readingPlans";
import Icon from "./Icon";

interface ReadingPlansViewProps {
  /** Which plan's day list is open — null shows the three plan cards. */
  openPlanId: string | null;
  onOpenPlan: (planId: string | null) => void;
  /** Completed day numbers per plan id (see fetchPlanProgress). */
  progress: Record<string, number[]>;
  /** Reader tapped a day — load its passage (and focus its place on the map when it has one). */
  onSelectDay: (plan: ReadingPlan, day: ReadingPlanDay) => void;
  onToggleDay: (planId: string, dayNumber: number) => void;
  /** Closes the Reading Plans view, returning to whatever chapter/intro was showing before — the
   * only way back at the top (plan-cards) level, since Reading Plans no longer has its own toolbar
   * toggle chip (see BiblePanel/MobileTabBar/AuthButton for where it's opened from instead). */
  onClose: () => void;
}

/** The "Reading Plans" view inside the Bible panel — a state-driven swap like the book intro (see
 * showPlans in BiblePanel): plan cards with progress bars, then each plan's tappable day list. */
export default function ReadingPlansView({ openPlanId, onOpenPlan, progress, onSelectDay, onToggleDay, onClose }: ReadingPlansViewProps) {
  const openPlan = openPlanId ? READING_PLANS.find((p) => p.id === openPlanId) : undefined;

  if (!openPlan) {
    return (
      <div className="bible-plans">
        <div className="bible-plans-header-row">
          <h4 className="bible-plans-heading">Reading Plans</h4>
          <button type="button" className="bible-plans-close" onClick={onClose} aria-label="Close Reading Plans">
            ×
          </button>
        </div>
        <p className="bible-plans-subtitle">Guided journeys through Scripture, tied to the places on the map.</p>
        {READING_PLANS.map((plan) => {
          const doneCount = (progress[plan.id] ?? []).filter((d) => plan.days.some((day) => day.day === d)).length;
          const pct = Math.round((doneCount / plan.days.length) * 100);
          return (
            <button key={plan.id} type="button" className="bible-plan-card" onClick={() => onOpenPlan(plan.id)}>
              <span className="bible-plan-card-title">{plan.title}</span>
              <span className="bible-plan-card-tagline">{plan.tagline}</span>
              <span className="bible-plan-progress-track" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={plan.days.length} aria-label={`${plan.title} progress`}>
                <span className="bible-plan-progress-fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="bible-plan-card-meta">
                {plan.days.length} days{doneCount > 0 ? ` · ${doneCount} done` : ""}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const doneDays = progress[openPlan.id] ?? [];
  const doneCount = doneDays.filter((d) => openPlan.days.some((day) => day.day === d)).length;

  return (
    <div className="bible-plans">
      <button type="button" className="bible-plans-back" onClick={() => onOpenPlan(null)}>
        ‹ All plans
      </button>
      <h4 className="bible-plans-heading">{openPlan.title}</h4>
      <p className="bible-plans-subtitle">{openPlan.tagline}</p>
      <p className="bible-plans-count">
        {doneCount} of {openPlan.days.length} days done
      </p>
      <ol className="bible-plan-days">
        {openPlan.days.map((day) => {
          const done = doneDays.includes(day.day);
          return (
            <li key={day.day} className={`bible-plan-day${done ? " bible-plan-day-done" : ""}`}>
              <button
                type="button"
                className="bible-plan-day-check"
                role="checkbox"
                aria-checked={done}
                aria-label={`Mark day ${day.day} ${done ? "not done" : "done"}`}
                title={done ? "Mark day not done" : "Mark day done"}
                onClick={() => onToggleDay(openPlan.id, day.day)}
              >
                {done ? "✓" : ""}
              </button>
              <button type="button" className="bible-plan-day-main" onClick={() => onSelectDay(openPlan, day)}>
                <span className="bible-plan-day-top">
                  <span className="bible-plan-day-num">Day {day.day}</span>
                  <span className="bible-plan-day-ref">
                    {formatPlanDayDisplayReference(day)}
                    {(day.locationId || day.poiId) && <span className="bible-plan-day-pin" aria-label="Shown on the map"> <Icon name="place" inline /></span>}
                  </span>
                </span>
                <span className="bible-plan-day-title">{day.title}</span>
                {day.note && <span className="bible-plan-day-note">{day.note}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
