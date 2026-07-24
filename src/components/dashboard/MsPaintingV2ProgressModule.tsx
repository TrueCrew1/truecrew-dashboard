import { Panel, StatusBadge } from "@/components/ui";
import {
  MS_PAINTING_V2_PROGRESS_STATUS,
  packageStateBadgeTone,
  subsystemStateBadgeTone,
} from "@/data/msPaintingV2Status";

/**
 * Above-the-fold Today module: M&S Painting V2 package filing, subsystem
 * readiness, current P0, and known blockers. Driven by typed local config
 * (`msPaintingV2Status`) until a live project-status store exists.
 */
export function MsPaintingV2ProgressModule() {
  const status = MS_PAINTING_V2_PROGRESS_STATUS;

  return (
    <div className="ms-v2-progress-wrap">
      <Panel title={status.title}>
        <div className="ms-v2-progress" aria-label="M and S Painting V2 progress">
          <div className="ms-v2-progress-grid">
            <section className="ms-v2-progress-section" aria-labelledby="ms-v2-packages-heading">
              <h3 id="ms-v2-packages-heading" className="ms-v2-progress-section-title">
                Package states
              </h3>
              <ul className="ms-v2-progress-list">
                {status.packages.map((pkg) => (
                  <li key={pkg.id} className="ms-v2-progress-row">
                    <span className="ms-v2-progress-label">{pkg.label}</span>
                    <StatusBadge status={pkg.state} variant={packageStateBadgeTone(pkg.state)} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="ms-v2-progress-section" aria-labelledby="ms-v2-subsystems-heading">
              <h3 id="ms-v2-subsystems-heading" className="ms-v2-progress-section-title">
                Subsystem states
              </h3>
              <ul className="ms-v2-progress-list">
                {status.subsystems.map((sub) => (
                  <li key={sub.id} className="ms-v2-progress-row">
                    <span className="ms-v2-progress-label">{sub.label}</span>
                    <StatusBadge
                      status={sub.state}
                      variant={subsystemStateBadgeTone(sub.state)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="ms-v2-progress-section" aria-labelledby="ms-v2-priority-heading">
            <h3 id="ms-v2-priority-heading" className="ms-v2-progress-section-title">
              Current priority
            </h3>
            <p className="ms-v2-progress-priority">
              <StatusBadge status="P0" variant="orange" />
              <span>{status.currentPriority.label}</span>
            </p>
            <p className="ms-v2-progress-next">
              <span className="ms-v2-progress-next-label">Next executable slice</span>
              {status.currentPriority.nextExecutableSlice}
            </p>
          </section>

          <section className="ms-v2-progress-section" aria-labelledby="ms-v2-blockers-heading">
            <h3 id="ms-v2-blockers-heading" className="ms-v2-progress-section-title">
              Known blockers
            </h3>
            <ul className="ms-v2-progress-blockers">
              {status.knownBlockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </section>
        </div>
      </Panel>
    </div>
  );
}
