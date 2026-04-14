import { State, Symbol, Automaton, ConversionStep, ConversionResult } from '../types';

export const EPSILON = 'ε';

export function getEpsilonClosure(states: State[], nfa: Automaton): State[] {
  const closure = new Set<State>(states);
  const stack = [...states];

  while (stack.length > 0) {
    const currentState = stack.pop()!;
    const epsilonTransitions = nfa.transitions.filter(
      (t) => t.from === currentState && (t.symbol === EPSILON || t.symbol === '')
    );

    for (const t of epsilonTransitions) {
      for (const nextState of t.to) {
        if (!closure.has(nextState)) {
          closure.add(nextState);
          stack.push(nextState);
        }
      }
    }
  }

  return Array.from(closure).sort();
}

export function move(states: State[], symbol: Symbol, nfa: Automaton): State[] {
  const nextStates = new Set<State>();
  for (const state of states) {
    const transitions = nfa.transitions.filter(
      (t) => t.from === state && t.symbol === symbol
    );
    for (const t of transitions) {
      for (const nextState of t.to) {
        nextStates.add(nextState);
      }
    }
  }
  return Array.from(nextStates).sort();
}

export function statesToName(states: State[]): string {
  if (states.length === 0) return '∅';
  return `{${states.sort().join(',')}}`;
}

export function convertNFAtoDFA(nfa: Automaton): ConversionResult {
  const steps: ConversionStep[] = [];
  const dfaStates: string[] = [];
  const dfaTransitions: { from: string; to: string; symbol: Symbol }[] = [];
  const dfaFinalStates: string[] = [];
  
  const stateMap = new Map<string, State[]>();
  const unprocessedStates: string[] = [];

  // Initial state of DFA is epsilon closure of NFA start state
  const startClosure = getEpsilonClosure([nfa.startState], nfa);
  const startName = statesToName(startClosure);
  
  dfaStates.push(startName);
  stateMap.set(startName, startClosure);
  unprocessedStates.push(startName);

  const alphabet = nfa.alphabet.filter(s => s !== EPSILON && s !== '');

  while (unprocessedStates.length > 0) {
    const currentDFAName = unprocessedStates.shift()!;
    const currentNFAStates = stateMap.get(currentDFAName)!;

    // Check if it's a final state
    if (currentNFAStates.some(s => nfa.finalStates.includes(s))) {
      if (!dfaFinalStates.includes(currentDFAName)) {
        dfaFinalStates.push(currentDFAName);
      }
    }

    for (const symbol of alphabet) {
      const movedStates = move(currentNFAStates, symbol, nfa);
      const targetClosure = getEpsilonClosure(movedStates, nfa);
      const targetName = statesToName(targetClosure);

      let isNew = false;
      if (!stateMap.has(targetName)) {
        dfaStates.push(targetName);
        stateMap.set(targetName, targetClosure);
        unprocessedStates.push(targetName);
        isNew = true;
      }

      dfaTransitions.push({ from: currentDFAName, to: targetName, symbol });
      steps.push({
        dfaState: currentDFAName,
        symbol,
        nfaTargetStates: targetClosure,
        dfaTargetState: targetName,
        isNewState: isNew
      });
    }
  }

  const dfa: Automaton = {
    states: dfaStates,
    alphabet: alphabet,
    transitions: dfaTransitions.map(t => ({ from: t.from, to: [t.to], symbol: t.symbol })),
    startState: startName,
    finalStates: dfaFinalStates
  };

  return { dfa, steps, stateMap };
}
