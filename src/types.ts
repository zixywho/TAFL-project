export type State = string;
export type Symbol = string;

export interface Transition {
  from: State;
  to: State[];
  symbol: Symbol;
}

export interface Automaton {
  states: State[];
  alphabet: Symbol[];
  transitions: Transition[];
  startState: State;
  finalStates: State[];
}

export interface ConversionStep {
  dfaState: string; // The subset of NFA states as a string, e.g., "{q0,q1}"
  symbol: Symbol;
  nfaTargetStates: State[];
  dfaTargetState: string;
  isNewState: boolean;
}

export interface ConversionResult {
  dfa: Automaton;
  steps: ConversionStep[];
  stateMap: Map<string, State[]>; // Maps DFA state name to NFA state subset
}
