import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import styles from "./cockpit-shell.module.css";

type CockpitShellProps = {
  children: ReactNode;
  className?: string;
  label?: string;
};

/**
 * Shared visual chassis for JARVIS module screens.
 *
 * It deliberately owns only the cockpit geometry and decorative glass. Data,
 * commands and page-specific state stay in the module rendered as children.
 */
export function CockpitShell({
  children,
  className,
  label = "Командный модуль",
}: CockpitShellProps) {
  return (
    <section className={cn(styles.shell, className)} data-cockpit-shell="">
      <div className={styles.upperFrame} aria-hidden="true" />
      <div className={styles.leftWing} aria-hidden="true" />
      <div className={styles.rightWing} aria-hidden="true" />
      <div className={styles.label} aria-hidden="true">
        <span />
        {label}
      </div>
      <div className={styles.viewport}>{children}</div>
      <div className={styles.commandArc} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </section>
  );
}
