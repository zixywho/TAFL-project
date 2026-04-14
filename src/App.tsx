import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Play, ChevronRight, ChevronLeft, RotateCcw, Info, Settings2, Table as TableIcon, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Automaton, State, Symbol, Transition, ConversionResult } from './types';
import { convertNFAtoDFA, EPSILON } from './lib/automata';
import AutomataGraph from './components/AutomataGraph';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const INITIAL_NFA: Automaton = {
  states: ['q0', 'q1', 'q2'],
  alphabet: ['0', '1'],
  transitions: [
    { from: 'q0', to: ['q0', 'q1'], symbol: '0' },
    { from: 'q0', to: ['q0'], symbol: '1' },
    { from: 'q1', to: ['q2'], symbol: '1' },
  ],
  startState: 'q0',
  finalStates: ['q2'],
};

export default function App() {
  const [nfa, setNfa] = useState<Automaton>(INITIAL_NFA);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [activeTab, setActiveTab] = useState('input');

  // Input states
  const [newState, setNewState] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newTransFrom, setNewTransFrom] = useState('');
  const [newTransTo, setNewTransTo] = useState('');
  const [newTransSymbol, setNewTransSymbol] = useState('');

  const handleReset = () => {
    setNfa(INITIAL_NFA);
    setConversionResult(null);
    setCurrentStepIdx(-1);
    setActiveTab('input');
  };

  const handleConvert = () => {
    const result = convertNFAtoDFA(nfa);
    setConversionResult(result);
    setCurrentStepIdx(-1);
    setActiveTab('visualize');
  };

  const resetConversion = () => {
    setConversionResult(null);
    setCurrentStepIdx(-1);
  };

  const nextStep = () => {
    if (conversionResult && currentStepIdx < conversionResult.steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIdx >= 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  // Partial DFA based on current step
  const partialDFA = useMemo(() => {
    if (!conversionResult) return null;
    if (currentStepIdx === -1) {
      return {
        ...conversionResult.dfa,
        states: [conversionResult.dfa.startState],
        transitions: [],
        finalStates: conversionResult.dfa.finalStates.filter(s => s === conversionResult.dfa.startState)
      };
    }

    const visibleSteps = conversionResult.steps.slice(0, currentStepIdx + 1);
    const states = new Set<string>([conversionResult.dfa.startState]);
    const transitions: Transition[] = [];
    
    visibleSteps.forEach(step => {
      states.add(step.dfaState);
      states.add(step.dfaTargetState);
      transitions.push({
        from: step.dfaState,
        to: [step.dfaTargetState],
        symbol: step.symbol
      });
    });

    return {
      ...conversionResult.dfa,
      states: Array.from(states),
      transitions,
      finalStates: conversionResult.dfa.finalStates.filter(s => states.has(s))
    };
  }, [conversionResult, currentStepIdx]);

  const currentStep = conversionResult?.steps[currentStepIdx];

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#e6edf3] font-sans selection:bg-blue-900/30">
      {/* Header */}
      <header className="border-b border-[#30363d] bg-[#0a0c10] sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#10b981] rounded-lg flex items-center justify-center text-black shadow-lg shadow-emerald-900/20">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">NFA &rarr; DFA Conversion</h1>
            <p className="text-xs text-[#848d97] font-medium uppercase tracking-wider">Subset Construction Method Visualizer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-[#30363d] text-[#10b981] border-none">
            {conversionResult ? `Step ${currentStepIdx + 1} of ${conversionResult.steps.length}` : "Ready"}
          </Badge>
          <Button variant="outline" size="sm" className="border-[#30363d] hover:bg-[#30363d]" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button size="sm" className="bg-[#10b981] hover:bg-[#059669] text-black font-bold" onClick={handleConvert}>
            <Play className="w-4 h-4 mr-2" /> Convert
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Input & Controls (Bento Sidebar) */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="bg-[#161b22] border-[#30363d] shadow-none h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-[#30363d]">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#848d97]">Input Automata</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-6 flex-grow overflow-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#848d97] uppercase tracking-wider">NFA States (Q)</label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add state" 
                      className="bg-[#0a0c10] border-[#30363d] text-sm h-8"
                      value={newState} 
                      onChange={e => setNewState(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && newState && (setNfa(prev => ({ ...prev, states: [...prev.states, newState] })), setNewState(''))}
                    />
                    <Button size="icon" variant="secondary" className="h-8 w-8 bg-[#30363d]" onClick={() => {
                      if (newState && !nfa.states.includes(newState)) {
                        setNfa(prev => ({ ...prev, states: [...prev.states, newState] }));
                        setNewState('');
                      }
                    }}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {nfa.states.map(s => (
                      <Badge key={s} variant={s === nfa.startState ? "default" : "secondary"} className={cn("pl-2 pr-1 py-0.5 text-[10px] border-none", s === nfa.startState ? "bg-[#7c3aed]" : "bg-[#30363d] text-[#e6edf3]")}>
                        {s}
                        <button onClick={() => setNfa(prev => ({ ...prev, states: prev.states.filter(st => st !== s) }))} className="ml-1 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#848d97] uppercase tracking-wider">Alphabet (&Sigma;)</label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add symbol" 
                      className="bg-[#0a0c10] border-[#30363d] text-sm h-8"
                      value={newSymbol} 
                      onChange={e => setNewSymbol(e.target.value)}
                    />
                    <Button size="icon" variant="secondary" className="h-8 w-8 bg-[#30363d]" onClick={() => {
                      if (newSymbol && !nfa.alphabet.includes(newSymbol)) {
                        setNfa(prev => ({ ...prev, alphabet: [...prev.alphabet, newSymbol] }));
                        setNewSymbol('');
                      }
                    }}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {nfa.alphabet.map(s => (
                      <Badge key={s} variant="outline" className="pl-2 pr-1 py-0.5 text-[10px] border-[#30363d] text-[#848d97]">
                        {s}
                        <button onClick={() => setNfa(prev => ({ ...prev, alphabet: prev.alphabet.filter(st => st !== s) }))} className="ml-1 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator className="bg-[#30363d]" />

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#848d97] uppercase tracking-wider">Transitions (&delta;)</label>
                  <div className="grid grid-cols-3 gap-1">
                    <select 
                      className="flex h-8 w-full rounded-md border border-[#30363d] bg-[#0a0c10] px-2 py-1 text-[10px] shadow-sm focus:outline-none"
                      value={newTransFrom}
                      onChange={e => setNewTransFrom(e.target.value)}
                    >
                      <option value="">From</option>
                      {nfa.states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select 
                      className="flex h-8 w-full rounded-md border border-[#30363d] bg-[#0a0c10] px-2 py-1 text-[10px] shadow-sm focus:outline-none"
                      value={newTransSymbol}
                      onChange={e => setNewTransSymbol(e.target.value)}
                    >
                      <option value="">Sym</option>
                      {nfa.alphabet.map(s => <option key={s} value={s}>{s}</option>)}
                      <option value={EPSILON}>{EPSILON}</option>
                    </select>
                    <select 
                      className="flex h-8 w-full rounded-md border border-[#30363d] bg-[#0a0c10] px-2 py-1 text-[10px] shadow-sm focus:outline-none"
                      value={newTransTo}
                      onChange={e => setNewTransTo(e.target.value)}
                    >
                      <option value="">To</option>
                      {nfa.states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <Button className="w-full h-8 text-xs bg-[#30363d] hover:bg-[#3d444d]" onClick={() => {
                    if (newTransFrom && newTransTo && newTransSymbol) {
                      setNfa(prev => {
                        const existing = prev.transitions.find(t => t.from === newTransFrom && t.symbol === newTransSymbol);
                        if (existing) {
                          return {
                            ...prev,
                            transitions: prev.transitions.map(t => 
                              t === existing ? { ...t, to: [...new Set([...t.to, newTransTo])] } : t
                            )
                          };
                        }
                        return {
                          ...prev,
                          transitions: [...prev.transitions, { from: newTransFrom, to: [newTransTo], symbol: newTransSymbol }]
                        };
                      });
                    }
                  }}>
                    Add Transition
                  </Button>
                  <ScrollArea className="h-32 border border-[#30363d] rounded-md p-2 bg-[#0a0c10]">
                    {nfa.transitions.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-[#30363d] last:border-0">
                        <span className="text-[10px] font-mono text-[#848d97]">
                          δ({t.from}, {t.symbol || 'ε'}) → {'{'}{t.to.join(',')}{'}'}
                        </span>
                        <button onClick={() => setNfa(prev => ({ ...prev, transitions: prev.transitions.filter((_, i) => i !== idx) }))} className="text-[#848d97] hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </ScrollArea>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#848d97] uppercase tracking-wider">Start State</label>
                    <select 
                      className="flex h-8 w-full rounded-md border border-[#30363d] bg-[#0a0c10] px-2 py-1 text-xs shadow-sm focus:outline-none"
                      value={nfa.startState}
                      onChange={e => setNfa(prev => ({ ...prev, startState: e.target.value }))}
                    >
                      {nfa.states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#848d97] uppercase tracking-wider">Final States</label>
                    <div className="flex flex-wrap gap-1">
                      {nfa.states.map(s => (
                        <button 
                          key={s} 
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold transition-colors",
                            nfa.finalStates.includes(s) 
                              ? "bg-red-500/20 text-red-400 border border-red-500/50" 
                              : "bg-[#0a0c10] text-[#848d97] border border-[#30363d]"
                          )}
                          onClick={() => setNfa(prev => ({
                            ...prev,
                            finalStates: prev.finalStates.includes(s) 
                              ? prev.finalStates.filter(fs => fs !== s)
                              : [...prev.finalStates, s]
                          }))}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NFA View */}
            <Card className="bg-[#161b22] border-[#30363d] shadow-none overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-[#30363d]">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#848d97]">Original NFA</CardTitle>
                <Badge variant="outline" className="text-[10px] border-[#7c3aed] text-[#7c3aed] bg-[#7c3aed]/10">NFA</Badge>
              </CardHeader>
              <CardContent className="p-0 relative">
                <div className="canvas-area">
                  <AutomataGraph 
                    automaton={nfa} 
                    width={500} 
                    height={320} 
                  />
                </div>
                <div className="absolute bottom-3 right-3 flex gap-3 text-[10px] font-bold text-[#848d97] uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#7c3aed]" /> Start
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" /> Final
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DFA View */}
            <Card className="bg-[#161b22] border-[#30363d] shadow-none overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-[#30363d]">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#848d97]">Resulting DFA</CardTitle>
                <Badge className="text-[10px] bg-[#10b981] text-black font-bold">DFA</Badge>
              </CardHeader>
              <CardContent className="p-0">
                {partialDFA ? (
                  <div className="canvas-area">
                    <AutomataGraph 
                      automaton={partialDFA} 
                      width={500} 
                      height={320} 
                      highlightState={currentStep?.dfaTargetState}
                    />
                  </div>
                ) : (
                  <div className="h-[320px] flex flex-col items-center justify-center text-[#848d97] bg-[#0a0c10]/50">
                    <Info className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">Awaiting Conversion</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Step Controls & Table (Bento Bottom) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Step Info */}
            <div className="lg:col-span-4">
              <Card className="bg-[#161b22] border-[#30363d] shadow-none h-full">
                <CardHeader className="py-3 border-b border-[#30363d]">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#848d97]">Step Analysis</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {!conversionResult ? (
                    <div className="p-4 rounded-lg bg-[#0a0c10] border border-[#30363d] text-center">
                      <p className="text-xs text-[#848d97] leading-relaxed">
                        Define your NFA and click <strong>Convert</strong> to begin the subset construction process.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xl font-mono font-bold text-[#10b981]">
                          {currentStepIdx === -1 ? "Initialization" : `Step ${currentStepIdx + 1}`}
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="outline" className="h-7 w-7 border-[#30363d] hover:bg-[#30363d]" onClick={prevStep} disabled={currentStepIdx === -1}>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-7 w-7 border-[#30363d] hover:bg-[#30363d]" onClick={nextStep} disabled={currentStepIdx === (conversionResult?.steps.length || 0) - 1}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentStepIdx}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="space-y-3"
                        >
                          {currentStepIdx === -1 ? (
                            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                              <p className="text-xs text-blue-400 leading-relaxed">
                                Starting with the ε-closure of <code>{nfa.startState}</code>.
                                This forms the initial DFA state <code>{conversionResult.dfa.startState}</code>.
                              </p>
                            </div>
                          ) : currentStep && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 bg-[#0a0c10] rounded border border-[#30363d]">
                                  <span className="text-[8px] font-bold text-[#848d97] uppercase">From State</span>
                                  <div className="text-xs font-mono font-bold truncate">{currentStep.dfaState}</div>
                                </div>
                                <div className="p-2 bg-[#0a0c10] rounded border border-[#30363d]">
                                  <span className="text-[8px] font-bold text-[#848d97] uppercase">Symbol</span>
                                  <div className="text-xs font-mono font-bold text-[#10b981]">{currentStep.symbol}</div>
                                </div>
                              </div>
                              <div className={cn(
                                "p-3 rounded-lg border",
                                currentStep.isNewState ? "bg-emerald-500/10 border-emerald-500/20" : "bg-[#0a0c10] border-[#30363d]"
                              )}>
                                <span className="text-[8px] font-bold uppercase text-[#848d97]">Target Subset</span>
                                <div className="text-xs font-mono font-bold text-[#e6edf3] mt-0.5">
                                  {currentStep.dfaTargetState}
                                </div>
                                {currentStep.isNewState && (
                                  <Badge className="mt-2 h-4 text-[8px] bg-[#10b981] text-black font-bold">NEW STATE</Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Transition Table */}
            <div className="lg:col-span-8">
              <Card className="bg-[#161b22] border-[#30363d] shadow-none h-full overflow-hidden">
                <Tabs defaultValue="dfa-table" className="w-full">
                  <CardHeader className="py-3 border-b border-[#30363d] flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-[#848d97]">Transition Table</CardTitle>
                    <TabsList className="bg-[#0a0c10] border border-[#30363d] h-6 p-0.5">
                      <TabsTrigger value="nfa-table" className="text-[8px] px-2 h-5 data-[state=active]:bg-[#30363d]">NFA</TabsTrigger>
                      <TabsTrigger value="dfa-table" className="text-[8px] px-2 h-5 data-[state=active]:bg-[#30363d]">DFA</TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent className="p-0">
                    <TabsContent value="nfa-table" className="m-0">
                      <ScrollArea className="h-[200px]">
                        <Table>
                          <TableHeader className="bg-[#0a0c10] sticky top-0 z-10">
                            <TableRow className="hover:bg-transparent border-[#30363d]">
                              <TableHead className="text-[10px] font-bold text-[#848d97] uppercase h-8">State</TableHead>
                              {nfa.alphabet.map(s => <TableHead key={s} className="text-[10px] font-bold text-[#848d97] uppercase text-center h-8">{s}</TableHead>)}
                              <TableHead className="text-[10px] font-bold text-[#848d97] uppercase text-center h-8">ε</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {nfa.states.map(state => (
                              <TableRow key={state} className="border-[#30363d] hover:bg-[#30363d]/20">
                                <TableCell className="font-mono text-[10px] py-2">
                                  {state === nfa.startState && <span className="text-[#10b981] mr-1">→</span>}
                                  {state}
                                  {nfa.finalStates.includes(state) && <span className="text-red-400 ml-0.5">*</span>}
                                </TableCell>
                                {nfa.alphabet.map(symbol => {
                                  const target = nfa.transitions.find(t => t.from === state && t.symbol === symbol);
                                  return (
                                    <TableCell key={symbol} className="text-center font-mono text-[10px] text-[#848d97] py-2">
                                      {target ? `{${target.to.join(',')}}` : "∅"}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-center font-mono text-[10px] text-[#848d97] py-2">
                                  {nfa.transitions.find(t => t.from === state && (t.symbol === EPSILON || t.symbol === ''))?.to.join(',') || "∅"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="dfa-table" className="m-0">
                      {!conversionResult ? (
                        <div className="h-[200px] flex items-center justify-center text-[#848d97] text-[10px] uppercase tracking-widest opacity-30">
                          Table will appear after conversion
                        </div>
                      ) : (
                        <ScrollArea className="h-[200px]">
                          <Table>
                            <TableHeader className="bg-[#0a0c10] sticky top-0 z-10">
                              <TableRow className="hover:bg-transparent border-[#30363d]">
                                <TableHead className="text-[10px] font-bold text-[#848d97] uppercase h-8">DFA State</TableHead>
                                {conversionResult.dfa.alphabet.map(s => <TableHead key={s} className="text-[10px] font-bold text-[#848d97] uppercase text-center h-8">{s}</TableHead>)}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {conversionResult.dfa.states.map(state => (
                                <TableRow key={state} className={cn(
                                  "border-[#30363d] hover:bg-[#30363d]/20",
                                  currentStep?.dfaState === state && "bg-[#10b981]/10"
                                )}>
                                  <TableCell className="font-mono text-[10px] py-2">
                                    {state === conversionResult.dfa.startState && <span className="text-[#10b981] mr-1">→</span>}
                                    <span className={cn(currentStep?.dfaState === state && "text-[#10b981] font-bold")}>{state}</span>
                                    {conversionResult.dfa.finalStates.includes(state) && <span className="text-red-400 ml-0.5">*</span>}
                                  </TableCell>
                                  {conversionResult.dfa.alphabet.map(symbol => {
                                    const target = conversionResult.dfa.transitions.find(t => t.from === state && t.symbol === symbol);
                                    const isActive = currentStep?.dfaState === state && currentStep?.symbol === symbol;
                                    return (
                                      <TableCell key={symbol} className={cn(
                                        "text-center font-mono text-[10px] py-2",
                                        isActive ? "text-[#10b981] font-bold" : "text-[#848d97]"
                                      )}>
                                        {target?.to[0] || "∅"}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      )}
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-[#30363d] bg-[#0a0c10] py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[10px] font-bold text-[#848d97] uppercase tracking-widest">
            Theory of Automata • Formal Languages • Subset Construction
          </div>
          <div className="text-[10px] text-[#848d97]">
            Visualizer v1.0 • Built with React & D3
          </div>
        </div>
      </footer>
    </div>
  );
}
