import {STATIONARY_ACTIONS} from './stationary-actions.js?v=182';

export const MACHINE_SPEED = 20;
export function machineDuration(type) {
  const action = {tractor:'dig', seeder:'sow', combine:'harvest', orchard:'tree'}[type];
  const definition = STATIONARY_ACTIONS.find(item => item.id === action);
  if (!definition) throw new Error('Unsupported field machine');
  return definition.duration * 1000 / MACHINE_SPEED;
}

export function waitForMachine(duration, cancelled, hidden = () => document.hidden) {
  return new Promise(resolve => {
    let elapsed = 0, previous = performance.now();
    function tick() {
      if (cancelled()) return resolve(false);
      const now = performance.now();
      if (!hidden()) elapsed += Math.min(50, now - previous);
      previous = now;
      if (elapsed >= duration) return resolve(true);
      setTimeout(tick, Math.min(25, duration - elapsed));
    }
    setTimeout(tick, Math.min(25, duration));
  });
}

// Each cell is committed through the existing farm APIs. Nothing is charged
// while waiting, so cancellation or closing the page cannot consume fuel.
export async function workField({type, jobs, io, cancelled, wait = waitForMachine, onProgress = () => {}}) {
  let done = 0;
  for (const cell of jobs) {
    if (cancelled()) break;
    if (!io.eligible(cell, false) || !io.reserve(cell)) continue;
    let charged = false;
    try {
      if (!await wait(machineDuration(type), cancelled)) break;
      if (cancelled() || !io.eligible(cell, true)) continue;
      if (!io.spendFuel()) break;
      charged = true;
      if (io.apply(cell)) { charged = false; onProgress(++done, cell); }
    } finally {
      if (charged) io.refundFuel();
      io.release(cell);
    }
  }
  return done;
}
