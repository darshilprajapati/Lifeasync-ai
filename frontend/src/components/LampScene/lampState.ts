import { useOutletContext } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/* Global In-Memory Lamp State Store (Preserved across Route Changes) */
/* ------------------------------------------------------------------ */
let sharedLampIsOn = true;
let sharedLampState: 'off' | 'turningOn' | 'on' | 'turningOff' = 'on';
const stateListeners = new Set<(state: 'off' | 'turningOn' | 'on' | 'turningOff', isOn: boolean) => void>();

function notifyListeners() {
  stateListeners.forEach((fn) => fn(sharedLampState, sharedLampIsOn));
}

export function getSharedLampState() {
  return {
    isOn: sharedLampIsOn,
    state: sharedLampState,
  };
}

export function subscribeLampState(fn: (state: 'off' | 'turningOn' | 'on' | 'turningOff', isOn: boolean) => void) {
  stateListeners.add(fn);
  return () => {
    stateListeners.delete(fn);
  };
}

export function toggleGlobalLamp() {
  if (sharedLampIsOn) {
    sharedLampIsOn = false;
    sharedLampState = 'turningOff';
    notifyListeners();

    setTimeout(() => {
      sharedLampState = 'off';
      notifyListeners();
    }, 450);
  } else {
    sharedLampIsOn = true;
    sharedLampState = 'turningOn';
    notifyListeners();

    setTimeout(() => {
      sharedLampState = 'on';
      notifyListeners();
    }, 450);
  }
}

export interface LampAuthOutletContext {
  isFormActive: boolean;
  lampState: 'off' | 'turningOn' | 'on' | 'turningOff';
  lampIsOn: boolean;
  toggleLamp: () => void;
}

export function useLampAuthContext(): LampAuthOutletContext {
  const ctx = useOutletContext<LampAuthOutletContext>();
  if (!ctx) {
    return {
      isFormActive: true,
      lampState: 'on',
      lampIsOn: true,
      toggleLamp: toggleGlobalLamp,
    };
  }
  return ctx;
}
