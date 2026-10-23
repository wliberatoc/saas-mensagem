export type SchedulerMode = 'browser' | 'cloud';

export function resolveSchedulerMode(value: string | undefined): SchedulerMode {
    return value === 'cloud' ? 'cloud' : 'browser';
}

export const schedulerMode = resolveSchedulerMode(import.meta.env.VITE_SCHEDULER_MODE);

export function shouldRunBrowserScheduler(mode: SchedulerMode = schedulerMode) {
    return mode === 'browser';
}
