
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calculator,
  ShieldCheck,
  DollarSign,
  Trash2,
  Copy,
  Check,
  Sun,
  Moon,
  Palette,
  ChevronDown,
  Ship,
  Keyboard,
  Info,
  Lock,
  Settings,
  X,
  RefreshCw,
  Save,
  Eraser,
  Activity,
  User,
  Layout,
  Code2,
  AlertTriangle
} from 'lucide-react';

// Default values if nothing is in localStorage
const DEFAULT_SETTINGS = {
  logo: 'logo.png',
  minBilling: 65.00,
  sellRatePercent: 0.40,
  buyRateMultiplier: 0.99,
  pgaMultiplier: 3,
  standardBuyFormula: '((invoice_value + duties) * 0.99) / 1000',
  standardSellFormula: '((invoice_value + duties) * 0.40) / 100',
  pgaBuyFormula: '(((invoice_value_with_pga * 3) + invoice_value_without_pga) * 0.99) / 1000',
  pgaSellFormula: '(((invoice_value_with_pga * 3) + invoice_value_without_pga) * 0.40) / 100',
};

const PALETTES = {
  classic: { name: 'Classic (TEU)', primary: '#004B8D', accent: '#FF6600' },
  emerald: { name: 'Emerald', primary: '#065f46', accent: '#10b981' },
  indigo: { name: 'Indigo', primary: '#3730a3', accent: '#6366f1' },
  slate: { name: 'Midnight', primary: '#1e293b', accent: '#38bdf8' },
  clean: { name: 'Modern Sky', primary: '#0ea5e9', accent: '#64748b' },
};

type PaletteKey = keyof typeof PALETTES;

// Safe formula evaluation function
const evaluateFormula = (formula: string, variables: Record<string, number>): number => {
  try {
    // Replace variable names with their values
    let expression = formula;
    for (const [key, value] of Object.entries(variables)) {
      expression = expression.replace(new RegExp(key.replace('_', '_?'), 'g'), value.toString());
    }

    // Basic security check - only allow numbers, operators, and parentheses
    if (!/^[\d\s+\-*/().]+$/.test(expression.replace(/\s/g, ''))) {
      throw new Error('Invalid characters in formula');
    }

    // Use Function constructor instead of eval for better security
    const result = new Function('return ' + expression)();
    return typeof result === 'number' && isFinite(result) ? result : 0;
  } catch (error) {
    console.error('Formula evaluation error:', error);
    return 0;
  }
};

// Validate formula syntax
const validateFormula = (formula: string, requiredVars: string[]): boolean => {
  try {
    // Check if all required variables are present
    for (const varName of requiredVars) {
      if (!formula.includes(varName)) {
        return false;
      }
    }

    // Test with sample values
    const testVars: Record<string, number> = {};
    requiredVars.forEach(v => testVars[v] = 100);

    const result = evaluateFormula(formula, testVars);
    return !isNaN(result) && isFinite(result);
  } catch {
    return false;
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'without' | 'with'>('without');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [palette, setPalette] = useState<PaletteKey>('classic');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Admin States
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminTab, setAdminTab] = useState<'identity' | 'logic'>('logic');
  const [adminSettings, setAdminSettings] = useState(() => {
    const saved = localStorage.getItem('teu_admin_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Local Admin Form States (to prevent immediate calculation churn)
  const [tempSettings, setTempSettings] = useState(adminSettings);

  // Quick Calc State
   const [calcDisplay, setCalcDisplay] = useState('0');
   const [calcExpression, setCalcExpression] = useState('');
   const [calcMemory, setCalcMemory] = useState<number | null>(null);
   const [calcHistory, setCalcHistory] = useState<string[]>([]);

  // Dynamic Colors
  const COLORS = PALETTES[palette];

  // Input States
  const [invoiceWithoutPga, setInvoiceWithoutPga] = useState<string>('');
  const [dutiesWithoutPga, setDutiesWithoutPga] = useState<string>('');
  const [buyInvoiceWithoutPga, setBuyInvoiceWithoutPga] = useState<string>('');
  const [buyInvoiceWithPga, setBuyInvoiceWithPga] = useState<string>('');
  const [sellInvoiceWithoutPga, setSellInvoiceWithoutPga] = useState<string>('');
  const [sellInvoiceWithPga, setSellInvoiceWithPga] = useState<string>('');

  const withoutPgaAmount = useMemo(() => {
    const inv = parseFloat(invoiceWithoutPga) || 0;
    const dut = parseFloat(dutiesWithoutPga) || 0;
    return (inv + dut).toString();
  }, [invoiceWithoutPga, dutiesWithoutPga]);

  const withPgaBuyBondValue = useMemo(() => {
    const withVal = parseFloat(buyInvoiceWithPga) || 0;
    const withoutVal = parseFloat(buyInvoiceWithoutPga) || 0;
    return ((withVal * adminSettings.pgaMultiplier) + withoutVal).toString();
  }, [buyInvoiceWithPga, buyInvoiceWithoutPga, adminSettings.pgaMultiplier]);

  const withPgaSellBondValue = useMemo(() => {
    const withVal = parseFloat(sellInvoiceWithPga) || 0;
    const withoutVal = parseFloat(sellInvoiceWithoutPga) || 0;
    return ((withVal * adminSettings.pgaMultiplier) + withoutVal).toString();
  }, [sellInvoiceWithPga, sellInvoiceWithoutPga, adminSettings.pgaMultiplier]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 700);
  };

  const handleInputChange = (setter: (val: string) => void, value: string) => {
    setter(value);
    triggerLoading();
  };

  const handleClear = () => {
    setInvoiceWithoutPga(''); setDutiesWithoutPga('');
    setBuyInvoiceWithoutPga(''); setBuyInvoiceWithPga('');
    setSellInvoiceWithoutPga(''); setSellInvoiceWithPga('');
    triggerLoading();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(`$${text}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const withoutPgaResults = useMemo(() => {
    const amount = parseFloat(withoutPgaAmount) || 0;
    const sellVal = (amount * adminSettings.sellRatePercent) / 100;
    const isBelowMin = amount > 0 && sellVal < adminSettings.minBilling;
    return {
      buy: ((amount * adminSettings.buyRateMultiplier) / 1000).toFixed(6),
      sell: sellVal.toFixed(6),
      isBelowMin,
      sellWarning: isBelowMin ? `Note: A minimum billing of $${adminSettings.minBilling.toFixed(2)} usually applies.` : null
    };
  }, [withoutPgaAmount, adminSettings]);

  const withPgaBuyResults = useMemo(() => {
    const base = parseFloat(withPgaBuyBondValue) || 0;
    return { buy: ((base * adminSettings.buyRateMultiplier) / 1000).toFixed(6) };
  }, [withPgaBuyBondValue, adminSettings]);

  const withPgaSellResults = useMemo(() => {
    const base = parseFloat(withPgaSellBondValue) || 0;
    const sellVal = (base * adminSettings.sellRatePercent) / 100;
    const isBelowMin = base > 0 && sellVal < adminSettings.minBilling;
    return {
      sell: sellVal.toFixed(6),
      isBelowMin,
      sellWarning: isBelowMin ? `Note: A minimum billing of $${adminSettings.minBilling.toFixed(2)} usually applies.` : null
    };
  }, [withPgaSellBondValue, adminSettings]);

  const testResults = useMemo(() => {
    const testValue = 10000;
    const buy = ((testValue * tempSettings.buyRateMultiplier) / 1000).toFixed(6);
    const sellVal = (testValue * tempSettings.sellRatePercent) / 100;
    const sell = Math.max(tempSettings.minBilling, sellVal).toFixed(6);
    return { buy, sell };
  }, [tempSettings]);

  const handleCalcBtn = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcExpression('');
    }
    else if (val === 'Backspace') {
      setCalcDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      setCalcExpression(prev => prev.slice(0, -1));
    }
    else if (val === 'MC') {
      setCalcMemory(null);
    }
    else if (val === 'MR') {
      if (calcMemory !== null) {
        setCalcDisplay(String(calcMemory));
        setCalcExpression(String(calcMemory));
      }
    }
    else if (val === 'MS') {
      const value = parseFloat(calcDisplay);
      if (!isNaN(value)) {
        setCalcMemory(value);
      }
    }
    else if (val === 'M+') {
      const value = parseFloat(calcDisplay);
      if (!isNaN(value)) {
        setCalcMemory(prev => prev !== null ? prev + value : value);
      }
    }
    else if (val === '.') {
      const lastToken = calcExpression.split(/[+\-×÷*/]/).pop() || '';
      if (!lastToken.includes('.')) {
        setCalcDisplay(prev => (prev === '0' || prev === 'Error') ? '0.' : prev + '.');
        setCalcExpression(prev => prev === '' ? '0.' : prev + '.');
      }
    }
    else if (val === '=') {
      try {
        const cleanExpr = calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
        // Simple safety check: only allow digits and operators
        if (/[^0-9+\-*/.]/.test(cleanExpr)) throw new Error();
        const result = eval(cleanExpr);
        const roundedResult = Number.isInteger(result) ? result : parseFloat(result.toFixed(8));
        setCalcDisplay(String(roundedResult));
        setCalcExpression(String(roundedResult));
      } catch {
        setCalcDisplay('Error');
        setCalcExpression('');
      }
    } else {
      const isOperator = ['+', '-', '×', '÷'].includes(val);
      if (calcDisplay === '0' && !isOperator) {
        setCalcDisplay(val);
        setCalcExpression(val);
      }
      else {
        setCalcDisplay(prev => (prev === 'Error' ? val : prev + val));
        setCalcExpression(prev => prev + val);
      }
    }
  };


  const checkPassword = () => {
    if (adminPassword === '332') {
      setAdminPassword('');
      setShowPasswordPrompt(false);
      setShowAdminPanel(true);
      setTempSettings(adminSettings);
    } else {
      alert('Unauthorized access attempt logged.');
      setAdminPassword('');
    }
  };

  const saveSettings = () => {
    // Validate formulas
    const validations = [
      { formula: tempSettings.standardBuyFormula, vars: ['invoice_value', 'duties'], name: 'Standard Buy Formula' },
      { formula: tempSettings.standardSellFormula, vars: ['invoice_value', 'duties'], name: 'Standard Sell Formula' },
      { formula: tempSettings.pgaBuyFormula, vars: ['invoice_value_with_pga', 'invoice_value_without_pga'], name: 'PGA Buy Formula' },
      { formula: tempSettings.pgaSellFormula, vars: ['invoice_value_with_pga', 'invoice_value_without_pga'], name: 'PGA Sell Formula' },
    ];

    for (const { formula, vars, name } of validations) {
      if (!validateFormula(formula, vars)) {
        alert(`Invalid ${name}. Please check the formula syntax and ensure all required variables are included.`);
        return;
      }
    }

    setAdminSettings(tempSettings);
    localStorage.setItem('teu_admin_settings', JSON.stringify(tempSettings));
    setShowAdminPanel(false);
    triggerLoading();
  };

  const resetToDefault = () => {
    if (confirm('Reset all formulas, parameters, and branding to factory defaults?')) {
      setTempSettings(DEFAULT_SETTINGS);
    }
  };

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key;
      if (/[0-9]/.test(key)) handleCalcBtn(key);
      else if (key === '+') handleCalcBtn('+');
      else if (key === '-') handleCalcBtn('-');
      else if (key === '*') handleCalcBtn('×');
      else if (key === '/') handleCalcBtn('÷');
      else if (key === 'Enter' || key === '=') { e.preventDefault(); handleCalcBtn('='); }
      else if (key.toLowerCase() === 'c' || key === 'Escape') handleCalcBtn('C');
      else if (key === 'Backspace') handleCalcBtn('Backspace');
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [calcExpression, calcDisplay]);

  const calculatorButtons = [
    { value: 'C', label: 'C', color: 'text-red-500 bg-red-50 dark:bg-red-900/10' },
    { value: '÷', label: '÷', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
    { value: '×', label: '×', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
    { value: 'Backspace', label: '⌫', color: 'text-slate-400' },
    
    { value: '7', label: '7', tooltip: '7' },
    { value: '8', label: '8', tooltip: '8' },
    { value: '9', label: '9', tooltip: '9' },
    { value: '-', label: '-', tooltip: 'Subtract (-)' },
    
    { value: '4', label: '4', tooltip: '4' },
    { value: '5', label: '5', tooltip: '5' },
    { value: '6', label: '6', tooltip: '6' },
    { value: '+', label: '+', tooltip: 'Add (+)' },
    
    { value: '1', label: '1', tooltip: '1' },
    { value: '2', label: '2', tooltip: '2' },
    { value: '3', label: '3', tooltip: '3' },
    { value: '.', label: '.', tooltip: 'Decimal (.)' },
    
    { value: '0', label: '0', tooltip: '0' },
    { value: '=', label: '=', color: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' },
  ];

  const getInputClassName = (isPrimaryFocus: boolean) => `
    w-full rounded-2xl shadow-2xl border-b border-r border-purple-600 dark:border-orange-400 py-3 px-4 text-xl outline- transition-all duration-300 font-bold
    bg-white dark:bg-slate-800 dark:text-white border-b border-r border-blue-500 dark:border-orange-700
    hover:border-orange-400 dark:hover:border-blue-600 hover:shadow-lg
    ${isPrimaryFocus ? 'focus:border-[var(--brand-primary)] focus:shadow-lg focus:shadow-[var(--brand-primary)]/20' : 'focus:border-[var(--brand-accent)] focus:shadow-lg focus:shadow-[var(--brand-accent)]/20'}
  `;

  return (
    <div className="min-h-screen pb-12 bg-light-bg dark:bg-dark-bg transition-colors duration-300" style={{ '--brand-primary': COLORS.primary, '--brand-accent': COLORS.accent } as any}>
      <header className="bg-white dark:bg-slate-800 shadow-md py-4 px-6 border-b-4 border-[var(--brand-primary)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="bg-white p-2 rounded-xl shadow-inner border-b border-r border-blue-600 flex items-center justify-center min-w-[120px] max-w-[200px] overflow-hidden">
              <img 
                src={adminSettings.logo} 
                alt="Brand Logo" 
                className="h-10 md:h-14 w-auto object-contain transition-transform hover:scale-105"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x80/004B8D/FFFFFF?text=Brand+Logo'; }}
              />
            </div>
            <div className="flex flex-col items-center md:items-start">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <h1 className="text-xl md:text-3xl font-black" style={{ color: COLORS.accent }}>TRADE EXPEDITORS USA, INC.</h1>
                <h1 className="text-xl md:text-3xl font-black" style={{ color: COLORS.primary }}>DBA TEU GLOBAL</h1>
              </div>
              <h2 className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1">Professional Bond Calculation Engine</h2>
            </div>
          </div>
          <div className="flex items-center gap-3 relative" ref={menuRef}>
            <button onClick={() => setShowPasswordPrompt(true)} className="p-3 rounded-full bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:scale-110 transition-all border border-slate-200 dark:border-slate-600 shadow-sm" title="Admin Settings">
              <Lock size={20} />
            </button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-full bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 hover:scale-110 transition-all shadow-sm">
              {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 p-3 px-6 rounded-full font-black text-slate-600 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 hover:scale-105 transition-all shadow-sm">
                <Palette size={20} />
                <span className="hidden sm:inline">Palette</span>
                <ChevronDown size={18} className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-b border-r border-blue-400 dark:border-orange-600 z-[100] overflow-hidden">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-blue-400 dark:border-orange-500 text-[10px] font-black uppercase text-slate-400">Branding Schemes</div>
                  <div className="p-2 space-y-1">
                    {(Object.keys(PALETTES) as PaletteKey[]).map(key => (
                      <button key={key} onClick={() => { setPalette(key); setIsMenuOpen(false); triggerLoading(); }} className={`w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all ${palette === key ? 'bg-slate-100 dark:bg-slate-700' : ''}`}>
                        <div className="flex -space-x-1">
                          <div className="w-5 h-5 rounded-full border-b border-r border-orange-400 dark:border-blue-500 shadow-sm" style={{ backgroundColor: PALETTES[key].primary }} />
                          <div className="w-5 h-5 rounded-full border-b border-r border-orange-400 dark:border-blue-500 shadow-sm" style={{ backgroundColor: PALETTES[key].accent }} />
                        </div>
                        <span className="text-sm font-bold">{PALETTES[key].name}</span>
                        {palette === key && <Check size={16} className="ml-auto text-[var(--brand-primary)]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ADMIN PANEL - ENHANCED PROFESSIONAL UI */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 w-full max-w-6xl rounded-[2rem] shadow-[0_0_150px_-30px_rgba(0,0,0,0.8)] border border-slate-200/50 dark:border-slate-700/50 overflow-hidden animate-in slide-in-from-bottom-8 zoom-in-98 duration-500 flex flex-col h-[90vh] relative">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-900/10 dark:to-purple-900/10 pointer-events-none" />

            <div className="relative flex items-center justify-between p-8 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="p-5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl text-white shadow-2xl shadow-blue-500/30 animate-in zoom-in-50 duration-700">
                    <Settings size={36} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse" />
                </div>
                <div className="animate-in slide-in-from-left-4 duration-500">
                  <h3 className="text-4xl font-black tracking-tight uppercase bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Control Center</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-blue-600 animate-pulse" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">System Architecture</span>
                    </div>
                    <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Brand DNA</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="p-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:scale-110 group"
              >
                <X size={28} className="group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              {/* Enhanced Sidebar Tabs */}
              <div className="w-72 border-r border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-b from-slate-50/80 to-white/80 dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-sm p-8 space-y-3 relative">
                {/* Tab indicator */}
                <div className={`absolute left-0 top-0 w-1 h-20 bg-gradient-to-b from-blue-600 to-blue-700 rounded-r-full transition-all duration-300 ${adminTab === 'identity' ? 'translate-y-8' : 'translate-y-28'}`} />

                <button
                  onClick={() => setAdminTab('identity')}
                  className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl font-black text-sm tracking-wide transition-all duration-300 group relative overflow-hidden ${
                    adminTab === 'identity'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/30 scale-105'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-md'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    adminTab === 'identity'
                      ? 'bg-white/20'
                      : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
                  }`}>
                    <Layout size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-black">BRAND IDENTITY</div>
                    <div className={`text-xs font-bold uppercase tracking-wider transition-all ${
                      adminTab === 'identity'
                        ? 'text-blue-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      Visual Assets
                    </div>
                  </div>
                  {adminTab === 'identity' && (
                    <div className="ml-auto">
                      <Check size={18} className="text-white animate-in zoom-in duration-200" />
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setAdminTab('logic')}
                  className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl font-black text-sm tracking-wide transition-all duration-300 group relative overflow-hidden ${
                    adminTab === 'logic'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/30 scale-105'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-md'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    adminTab === 'logic'
                      ? 'bg-white/20'
                      : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
                  }`}>
                    <Code2 size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-black">ENGINE LOGIC</div>
                    <div className={`text-xs font-bold uppercase tracking-wider transition-all ${
                      adminTab === 'logic'
                        ? 'text-blue-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      Calculation Rules
                    </div>
                  </div>
                  {adminTab === 'logic' && (
                    <div className="ml-auto">
                      <Check size={18} className="text-white animate-in zoom-in duration-200" />
                    </div>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                {adminTab === 'identity' ? (
                  <div className="space-y-10">
                    <section className="animate-in slide-in-from-left-4 duration-500">
                      <h4 className="text-sm font-black uppercase text-blue-600 tracking-widest mb-8 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                          <User size={16} className="text-blue-600" />
                        </div>
                        <span>Core Branding Assets</span>
                      </h4>

                      <div className="p-12 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col lg:flex-row items-center gap-12 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-transparent dark:from-blue-900/10 dark:to-transparent" />

                        <div className="relative w-56 h-56 rounded-3xl bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-700 border-4 border-white dark:border-slate-600 shadow-2xl flex items-center justify-center overflow-hidden shrink-0 group">
                          <img
                            src={tempSettings.logo}
                            className="max-w-full max-h-full object-contain p-6 transition-all duration-300 group-hover:scale-110"
                            alt="Branding"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/004B8D/FFFFFF?text=Brand+Logo'; }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-white p-6 text-center">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl mb-3">
                              <User size={24} className="text-white" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-widest">Master Asset</span>
                            <span className="text-xs opacity-80 mt-1">TEU Global Brand</span>
                          </div>
                        </div>

                        <div className="flex-1 space-y-8 text-center lg:text-left">
                          <div>
                            <h5 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Primary Application Logo</h5>
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-lg">
                              The logo is fixed to <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono text-sm">logo.png</code> and cannot be changed through this interface.
                            </p>
                          </div>

                          <div className="flex items-center justify-center lg:justify-start gap-4">
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="font-medium">Asset Status: Active</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="space-y-12">
                    <section>
                      <h4 className="text-xs font-black uppercase text-blue-600 tracking-widest mb-8 flex items-center gap-2">
                        <Activity size={14} /> Formula Studio
                      </h4>
                      
                      {/* Enhanced Formula Visualizer */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        <div className="relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-blue-800/10 rounded-3xl" />
                          <div className="relative p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-blue-500/20 shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-3 bg-blue-600 rounded-2xl">
                                <Calculator size={20} className="text-white" />
                              </div>
                              <span className="text-sm font-black text-blue-400 uppercase tracking-widest">Standard Entry Buy Formula</span>
                            </div>
                            <div className="font-mono text-base text-white/90 leading-relaxed bg-gradient-to-r from-black/60 to-black/40 p-6 rounded-2xl border border-white/10 shadow-inner">
                              <div className="text-blue-300 font-bold mb-2">{tempSettings.standardBuyFormula}</div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-blue-300">
                              <Activity size={12} className="animate-pulse" />
                              <span>Real-time calculation engine</span>
                            </div>
                          </div>
                        </div>

                        <div className="relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-orange-800/10 rounded-3xl" />
                          <div className="relative p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-orange-500/20 shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-3 bg-orange-600 rounded-2xl">
                                <DollarSign size={20} className="text-white" />
                              </div>
                              <span className="text-sm font-black text-orange-400 uppercase tracking-widest">Standard Entry Sell Formula</span>
                            </div>
                            <div className="font-mono text-base text-white/90 leading-relaxed bg-gradient-to-r from-black/60 to-black/40 p-6 rounded-2xl border border-white/10 shadow-inner">
                              <div className="text-orange-300 font-bold mb-2">{tempSettings.standardSellFormula}</div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-orange-300">
                              <Activity size={12} className="animate-pulse" />
                              <span>Advanced fee calculation</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PGA Formula Visualizer */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        <div className="relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-green-800/10 rounded-3xl" />
                          <div className="relative p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-green-500/20 shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-3 bg-green-600 rounded-2xl">
                                <Calculator size={20} className="text-white" />
                              </div>
                              <span className="text-sm font-black text-green-400 uppercase tracking-widest">PGA Buy Formula</span>
                            </div>
                            <div className="font-mono text-base text-white/90 leading-relaxed bg-gradient-to-r from-black/60 to-black/40 p-6 rounded-2xl border border-white/10 shadow-inner">
                              <div className="text-green-300 font-bold mb-2">{tempSettings.pgaBuyFormula}</div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-green-300">
                              <Activity size={12} className="animate-pulse" />
                              <span>PGA calculation engine</span>
                            </div>
                          </div>
                        </div>

                        <div className="relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-purple-800/10 rounded-3xl" />
                          <div className="relative p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-purple-500/20 shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-3 bg-purple-600 rounded-2xl">
                                <DollarSign size={20} className="text-white" />
                              </div>
                              <span className="text-sm font-black text-purple-400 uppercase tracking-widest">PGA Sell Formula</span>
                            </div>
                            <div className="font-mono text-base text-white/90 leading-relaxed bg-gradient-to-r from-black/60 to-black/40 p-6 rounded-2xl border border-white/10 shadow-inner">
                              <div className="text-purple-300 font-bold mb-2">{tempSettings.pgaSellFormula}</div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-purple-300">
                              <Activity size={12} className="animate-pulse" />
                              <span>PGA fee calculation</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Formula Editors */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        <div className="space-y-6">
                          <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                              <Calculator size={16} className="text-blue-600" />
                            </div>
                            <span>Standard Entry Buy Formula</span>
                          </label>
                          <div className="relative group">
                            <textarea
                              value={tempSettings.standardBuyFormula}
                              onChange={(e) => setTempSettings({ ...tempSettings, standardBuyFormula: e.target.value })}
                              className="w-full bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl py-6 px-8 font-mono text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 shadow-lg hover:shadow-xl text-slate-900 dark:text-white resize-none"
                              rows={2}
                              placeholder="Enter formula using invoice_value and duties"
                            />
                          </div>
                        </div>

                        <div className="space-y-6">
                          <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                              <DollarSign size={16} className="text-orange-600" />
                            </div>
                            <span>Standard Entry Sell Formula</span>
                          </label>
                          <div className="relative group">
                            <textarea
                              value={tempSettings.standardSellFormula}
                              onChange={(e) => setTempSettings({ ...tempSettings, standardSellFormula: e.target.value })}
                              className="w-full bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl py-6 px-8 font-mono text-lg outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300 shadow-lg hover:shadow-xl text-slate-900 dark:text-white resize-none"
                              rows={2}
                              placeholder="Enter formula using invoice_value and duties"
                            />
                          </div>
                        </div>

                        <div className="space-y-6">
                          <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                              <Calculator size={16} className="text-green-600" />
                            </div>
                            <span>PGA Buy Formula</span>
                          </label>
                          <div className="relative group">
                            <textarea
                              value={tempSettings.pgaBuyFormula}
                              onChange={(e) => setTempSettings({ ...tempSettings, pgaBuyFormula: e.target.value })}
                              className="w-full bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl py-6 px-8 font-mono text-lg outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300 shadow-lg hover:shadow-xl text-slate-900 dark:text-white resize-none"
                              rows={2}
                              placeholder="Enter formula using invoice_value_with_pga and invoice_value_without_pga"
                            />
                          </div>
                        </div>

                        <div className="space-y-6">
                          <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                              <DollarSign size={16} className="text-purple-600" />
                            </div>
                            <span>PGA Sell Formula</span>
                          </label>
                          <div className="relative group">
                            <textarea
                              value={tempSettings.pgaSellFormula}
                              onChange={(e) => setTempSettings({ ...tempSettings, pgaSellFormula: e.target.value })}
                              className="w-full bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl py-6 px-8 font-mono text-lg outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-300 shadow-lg hover:shadow-xl text-slate-900 dark:text-white resize-none"
                              rows={2}
                              placeholder="Enter formula using invoice_value_with_pga and invoice_value_without_pga"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                              <DollarSign size={16} className="text-blue-600" />
                            </div>
                            <span>Minimum Entry Bill</span>
                          </label>
                          <div className="relative group">
                            <input
                              type="number"
                              step="1"
                              value={tempSettings.minBilling}
                              onChange={(e) => setTempSettings({ ...tempSettings, minBilling: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl py-6 px-8 font-black text-3xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 shadow-lg hover:shadow-xl text-slate-900 dark:text-white"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-black text-lg">$ USD</div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                              <Activity size={16} className="text-green-600" />
                            </div>
                            <span>Sell Percentage</span>
                          </label>
                          <div className="relative group">
                            <input
                              type="number"
                              step="0.01"
                              value={tempSettings.sellRatePercent}
                              onChange={(e) => setTempSettings({ ...tempSettings, sellRatePercent: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl py-6 px-8 font-black text-3xl outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300 shadow-lg hover:shadow-xl text-slate-900 dark:text-white"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-black text-lg">%</div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                              <Code2 size={16} className="text-purple-600" />
                            </div>
                            <span>Buy Index Multiplier</span>
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            value={tempSettings.buyRateMultiplier}
                            onChange={(e) => setTempSettings({ ...tempSettings, buyRateMultiplier: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl py-6 px-8 font-black text-3xl outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all duration-300 shadow-lg hover:shadow-xl text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="space-y-6">
                          <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                              <Ship size={16} className="text-orange-600" />
                            </div>
                            <span>PGA Liability Factor</span>
                          </label>
                          <div className="relative group">
                            <input
                              type="number"
                              step="1"
                              value={tempSettings.pgaMultiplier}
                              onChange={(e) => setTempSettings({ ...tempSettings, pgaMultiplier: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl py-6 px-8 font-black text-3xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300 shadow-lg hover:shadow-xl text-slate-900 dark:text-white"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-black text-lg">×</div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Live Sandbox Validation */}
                      <div className="mt-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-3xl" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-3xl" />
                        <div className="relative p-10 text-white">
                          <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                <Check size={24} className="text-white" />
                              </div>
                              <div>
                                <h5 className="font-black uppercase tracking-wider text-xl">Live Sandbox Validation</h5>
                                <p className="text-blue-100 text-sm font-medium">Real-time calculation testing</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                                <span className="text-sm font-black uppercase tracking-wider">Test Entry: $10,000</span>
                              </div>
                              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-8">
                            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-500 rounded-xl">
                                  <Calculator size={16} className="text-white" />
                                </div>
                                <p className="text-sm font-black uppercase opacity-80 tracking-wider">Buy Output</p>
                              </div>
                              <p className="text-5xl font-black text-white">${testResults.buy}</p>
                              <p className="text-xs text-blue-100 mt-2 font-medium">Bond purchase calculation</p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-green-500 rounded-xl">
                                  <DollarSign size={16} className="text-white" />
                                </div>
                                <p className="text-sm font-black uppercase opacity-80 tracking-wider">Sell Output</p>
                              </div>
                              <p className="text-5xl font-black text-white">${testResults.sell}</p>
                              <p className="text-xs text-green-100 mt-2 font-medium">Final fee calculation</p>
                            </div>
                          </div>

                          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-blue-100">
                            <Activity size={14} className="animate-pulse" />
                            <span className="font-medium">Parameters update automatically</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col lg:flex-row gap-6 items-center mt-auto backdrop-blur-sm">
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 font-bold text-sm uppercase tracking-widest order-2 lg:order-1">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
                </div>
                <span>Data persistence is local to this browser</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto lg:ml-auto order-1 lg:order-2">
                <button
                  onClick={resetToDefault}
                  className="px-8 py-4 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest hover:from-slate-300 hover:to-slate-400 dark:hover:from-slate-600 dark:hover:to-slate-500 transition-all active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-sm border border-slate-300 dark:border-slate-600"
                >
                  <RefreshCw size={18} />
                  <span>REVERT SYSTEM</span>
                </button>

                <button
                  onClick={saveSettings}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95 flex items-center justify-center gap-3 text-sm"
                >
                  <Save size={18} />
                  <span>COMMIT ALL PARAMETERS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Prompt */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[3.5rem] shadow-2xl p-12 text-center animate-in fade-in slide-in-from-bottom-12 duration-500 border border-slate-100 dark:border-slate-700">
            <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-10 shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)]">
              <Lock size={48} />
            </div>
            <h3 className="text-3xl font-black mb-3 tracking-tighter">Identity Verification</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-12">Administrative access requires high-clearance credentials.</p>
            <div className="relative mb-10">
              <input 
                type="password" autoFocus placeholder="••••" value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkPassword()}
                className="w-full bg-slate-50 dark:bg-slate-900 border-b border-r border-transparent focus:border-blue-600 rounded-3xl py-6 px-8 text-center text-5xl font-mono tracking-[0.8em] outline-none transition-all shadow-inner placeholder:opacity-20"
              />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowPasswordPrompt(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-700 rounded-2xl font-black text-slate-500 dark:text-slate-300 transition-all active:scale-95 uppercase tracking-widest text-xs">CANCEL</button>
              <button onClick={checkPassword} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-600/30 transition-all active:scale-95 uppercase tracking-widest text-xs">VERIFY</button>
            </div>
          </div>
        </div>
      )}

       <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
           {/* Left side: Tab selection and Buy/Sell calculators */}
           <div className="space-y-6">
             {/* Enhanced Tab Selection */}
             <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg border-b border-r border-blue-500 dark:border-orange-700">
               <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                 <div className="flex flex-col sm:flex-row items-center gap-6">
                   <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-2xl">
                     <button
                       onClick={() => setActiveTab('without')}
                       className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 text-sm uppercase relative overflow-hidden
                         ${activeTab === 'without'
                           ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                           : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                     >
                       Standard Entry
                     </button>
                     <button
                       onClick={() => setActiveTab('with')}
                       className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 text-sm uppercase relative overflow-hidden
                         ${activeTab === 'with'
                           ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/30'
                           : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                     >
                       WITH PGA Regulation
                     </button>
                   </div>
                   <div className="text-center lg:text-left">
                     <p className="text-sm text-slate-600 dark:text-slate-400">
                       Active Mode: <span className="font-bold text-slate-900 dark:text-white">
                         {activeTab === 'without' ? 'Standard Entry Protocol' : 'PGA Regulation Logic'}
                       </span>
                     </p>
                   </div>
                 </div>
                 <button
                   onClick={handleClear}
                   className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-6 py-3 rounded-xl font-bold border-b border-r border-red-500 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 hover:scale-105 transition-all shadow-sm flex items-center gap-2"
                 >
                   <Trash2 size={16}/>
                   <span className="text-sm">Clear All</span>
                 </button>
               </div>
             </div>

             {/* Buy and Sell Calculators Grid */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border-b border-r border-blue-500 dark:border-orange-700 overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-300 group relative">
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>
                 <div className="py-6 px-8 flex items-center justify-between text-white relative z-10" style={{ backgroundColor: COLORS.primary }}>
                   <h3 className="text-xl font-black uppercase tracking-wide">Buy Rate Calculator</h3>
                   <Calculator className="opacity-60" size={24} />
                 </div>
                 <div className="p-6 space-y-6 flex-1 flex flex-col relative z-10">
                   {activeTab === 'without' ? (
                     <>
                       <div className="space-y-4">
                         <div>
                           <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">Invoice Value ($)</label>
                           <input type="number" value={invoiceWithoutPga} onChange={(e) => handleInputChange(setInvoiceWithoutPga, e.target.value)} className={getInputClassName(true)} placeholder="0.00" />
                         </div>
                         <div>
                           <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">Duties ($)</label>
                           <input type="number" value={dutiesWithoutPga} onChange={(e) => handleInputChange(setDutiesWithoutPga, e.target.value)} className={getInputClassName(true)} placeholder="0.00" />
                         </div>
                       </div>
                       <div>
                         <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">Total Bond Value</label>
                         <div className="relative">
                           <input readOnly value={withoutPgaAmount} className={`${getInputClassName(true)} bg-slate-50 dark:bg-slate-700 opacity-75 cursor-not-allowed`} />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                         </div>
                       </div>
                     </>
                   ) : (
                     <>
                       <div className="space-y-4">
                         <div>
                           <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">Invoice Value (Without PGA)</label>
                           <input type="number" value={buyInvoiceWithoutPga} onChange={(e) => handleInputChange(setBuyInvoiceWithoutPga, e.target.value)} className={getInputClassName(true)} placeholder="0.00" />
                         </div>
                         <div>
                           <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">Invoice Value (With PGA)</label>
                           <input type="number" value={buyInvoiceWithPga} onChange={(e) => handleInputChange(setBuyInvoiceWithPga, e.target.value)} className={getInputClassName(false)} placeholder="0.00" />
                         </div>
                       </div>
                       <div>
                         <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">Scaled Bond Value</label>
                         <div className="relative">
                           <input readOnly value={withPgaBuyBondValue} className={`${getInputClassName(true)} bg-slate-50 dark:bg-slate-700 opacity-75 cursor-not-allowed`} />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                         </div>
                       </div>
                     </>
                   )}
                   <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
                     <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 text-center relative overflow-hidden">
                       {isLoading && (
                         <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-600/10 animate-pulse rounded-2xl" />
                       )}
                       <div className="relative">
                         <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-3 flex items-center justify-center gap-2">
                           Buy Rate Total
                           {isLoading && <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />}
                         </span>
                         <div className="flex items-center justify-center gap-3">
                           <span className={`text-3xl font-black transition-all duration-300 ${isLoading ? 'blur-sm' : ''}`} style={{ color: COLORS.primary }}>
                             ${activeTab === 'without' ? withoutPgaResults.buy : withPgaBuyResults.buy}
                           </span>
                           <button
                             onClick={() => handleCopy(activeTab === 'without' ? withoutPgaResults.buy : withPgaBuyResults.buy, 'buy')}
                             className="p-2 text-slate-400 hover:text-[var(--brand-primary)] hover:scale-110 transition-all rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 hover:shadow-md"
                             disabled={isLoading}
                             title="Copy to clipboard"
                           >
                             {copiedId === 'buy' ? <Check size={18} className="text-green-500 animate-in zoom-in" /> : <Copy size={18} />}
                           </button>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border-b border-r border-blue-500 dark:border-orange-700 overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-300 group relative">
                 <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>
                 <div className="py-6 px-8 flex items-center justify-between text-white relative z-10" style={{ backgroundColor: COLORS.accent }}>
                   <h3 className="text-xl font-black uppercase tracking-wide">Sell Rate Calculator</h3>
                   <DollarSign className="opacity-60" size={24} />
                 </div>
                 <div className="p-6 space-y-6 flex-1 flex flex-col relative z-10">
                   {activeTab === 'without' ? (
                     <>
                       <div className="space-y-4">
                         <div>
                           <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">Invoice Value ($)</label>
                           <input type="number" value={invoiceWithoutPga} onChange={(e) => handleInputChange(setInvoiceWithoutPga, e.target.value)} className={getInputClassName(true)} placeholder="0.00" />
                         </div>
                         <div>
                           <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">Duties ($)</label>
                           <input type="number" value={dutiesWithoutPga} onChange={(e) => handleInputChange(setDutiesWithoutPga, e.target.value)} className={getInputClassName(true)} placeholder="0.00" />
                         </div>
                       </div>
                       <div>
                         <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">Total Bond Value</label>
                         <div className="relative">
                           <input readOnly value={withoutPgaAmount} className={`${getInputClassName(true)} bg-slate-50 dark:bg-slate-700 opacity-75 cursor-not-allowed`} />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                         </div>
                       </div>
                     </>
                   ) : (
                     <>
                       <div className="space-y-4">
                         <div>
                           <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">Invoice Value (Without PGA)</label>
                           <input type="number" value={sellInvoiceWithoutPga} onChange={(e) => handleInputChange(setSellInvoiceWithoutPga, e.target.value)} className={getInputClassName(true)} placeholder="0.00" />
                         </div>
                         <div>
                           <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">Invoice Value (With PGA)</label>
                           <input type="number" value={sellInvoiceWithPga} onChange={(e) => handleInputChange(setSellInvoiceWithPga, e.target.value)} className={getInputClassName(false)} placeholder="0.00" />
                         </div>
                       </div>
                       <div>
                         <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-2">Scaled Bond Value</label>
                         <div className="relative">
                           <input readOnly value={withPgaSellBondValue} className={`${getInputClassName(true)} bg-slate-50 dark:bg-slate-700 opacity-75 cursor-not-allowed`} />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                         </div>
                       </div>
                     </>
                   )}
                   <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
                     <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 text-center relative">
                       <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-3">Sell Rate Total</span>
                       <div className="flex items-center justify-center gap-3">
                         <span className="text-3xl font-black" style={{ color: COLORS.accent }}>
                           ${activeTab === 'without' ? withoutPgaResults.sell : withPgaSellResults.sell}
                         </span>
                         <button
                           onClick={() => handleCopy(activeTab === 'without' ? withoutPgaResults.sell : withPgaSellResults.sell, 'sell')}
                           className="p-2 text-slate-400 hover:text-[var(--brand-accent)] hover:scale-110 transition-all rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 hover:shadow-md"
                           title="Copy to clipboard"
                         >
                           {copiedId === 'sell' ? <Check size={18} className="text-green-500 animate-in zoom-in" /> : <Copy size={18} />}
                         </button>
                       </div>
                       {(activeTab === 'without' ? withoutPgaResults.sellWarning : withPgaSellResults.sellWarning) && (
                         <div className="mt-3 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border-b border-r border-amber-500 dark:border-orange-700">
                           ⚠️ {activeTab === 'without' ? withoutPgaResults.sellWarning : withPgaSellResults.sellWarning}
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>

           {/* Right side: Regulations and Calculator */}
           <div className="space-y-6">
             {/* Regulations Info Board */}
             <div className="bg-white dark:bg-slate-800 border-b border-r border-blue-500 dark:border-orange-700 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Info size={60} className="animate-pulse" />
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 relative z-10">
                 <div className="space-y-6">
                   <div className="flex gap-4 items-start">
                     <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 text-white font-black shrink-0 shadow-lg shadow-blue-500/30 text-lg">1</div>
                     <div className="flex-1">
                       <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wide mb-2 text-lg sm:text-xl">Standard Entry Protocol</h4>
                       <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                         ISF Bonds are fixed at <span className="text-blue-600 font-black">$60</span>. Single-entry bonds bill the greater of <span className="text-blue-600 font-black">${adminSettings.minBilling.toFixed(2)}</span> or <span className="text-blue-600 font-black">{adminSettings.sellRatePercent.toFixed(2)}%</span> of total invoice value + duties.
                       </p>
                     </div>
                   </div>
                   <div className="flex gap-4 items-start">
                     <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 text-white font-black shrink-0 shadow-lg shadow-blue-500/30 text-lg">2</div>
                     <div className="flex-1">
                       <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wide mb-2 text-lg sm:text-xl">PGA Regulation Logic</h4>
                       <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                         For PGA commodities, calculation base is scaled by <span className="text-blue-600 font-black">{adminSettings.pgaMultiplier}x</span>. Final fee is the greater of <span className="text-blue-600 font-black">${adminSettings.minBilling.toFixed(2)}</span> or <span className="text-blue-600 font-black">{adminSettings.sellRatePercent.toFixed(2)}%</span> of the scaled base.
                       </p>
                     </div>
                   </div>
                 </div>
                 <div className="flex flex-col justify-center">
                   <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
                     <div className="text-center mb-6">
                       <div className="inline-flex items-center justify-center gap-2 mb-4 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
                         <ShieldCheck size={24} className="text-red-600" />
                         <span className="font-black uppercase tracking-wide text-sm text-red-600 dark:text-red-400">Active Compliance</span>
                       </div>
                     </div>
                     <div className="space-y-4">
                       <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-800/50 shadow-sm">
                         <div className="flex items-start gap-3">
                           <span className="shrink-0 w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 font-black text-xs">01</span>
                           <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">SEB charges only apply in the absence of a Continuous Bond.</p>
                         </div>
                       </div>
                       <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-orange-200 dark:border-orange-800/50 shadow-sm">
                         <div className="flex items-start gap-3">
                           <span className="shrink-0 w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 font-black text-xs">02</span>
                           <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">Opting for a continuous bond incurs a <span className="font-bold text-slate-900 dark:text-white">$550 annual fee</span> for a <span className="font-bold text-slate-900 dark:text-white">$50,000</span> limit of liability, valid for 1 year.</p>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>

             {/* Calculator */}
             <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border-b border-r border-purple-600 dark:border-red-700 overflow-hidden transition-all hover:shadow-2xl max-w-xl ml-auto cursor-pointer group">
               <div className="py-6 px-8 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-b border-orange-600 dark:border-orange-700">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                       <Calculator size={18} className="text-blue-600" />
                     </div>
                     <div>
                       <h3 className="font-bold uppercase text-sm tracking-wide text-slate-900 dark:text-white">Calculator</h3>
                       <p className="text-xs text-slate-500 dark:text-slate-400">Advanced Math Tool</p>
                     </div>
                   </div>
                   <button onClick={()=>handleCalcBtn('C')} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all hover:scale-110" title="Clear All">
                     <Trash2 size={16}/>
                   </button>
                 </div>
               </div>

               <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-6 text-right min-h-[140px] flex flex-col justify-end border-b border-slate-200 dark:border-slate-700">
                 <div className="text-slate-500 dark:text-slate-400 text-xs font-mono mb-3 truncate opacity-75 uppercase tracking-wide">
                   {calcExpression || 'Ready for input'}
                 </div>
                 <div className="text-3xl font-black font-mono truncate text-slate-900 dark:text-white mb-2">
                   {calcDisplay}
                 </div>
                 {calcMemory !== null && (
                   <div className="text-xs font-mono text-blue-600 dark:text-blue-400 opacity-75 flex items-center justify-end gap-1">
                     <span className="text-slate-400">M:</span> {calcMemory}
                   </div>
                 )}
                 <div className="flex items-center justify-center gap-1 mt-3 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                   <Keyboard size={10} />
                   <span>0-9, ±×÷, Enter, Esc</span>
                 </div>
               </div>

               {/* History Section */}
               {calcHistory.length > 0 && (
                 <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                   <div className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2 tracking-widest">Recent Calculations</div>
                   <div className="space-y-1 max-h-20 overflow-y-auto">
                     {calcHistory.slice(-3).reverse().map((calc, index) => (
                       <div key={index} className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                         {calc}
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               <div className="p-6 bg-white dark:bg-slate-800 space-y-4">
                 {/* Memory Functions */}
                 <div className="space-y-2">
                   <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest">Memory</div>
                   <div className="grid grid-cols-5 gap-2">
                     {[
                       { value: 'MC', label: 'MC', title: 'Memory Clear' },
                       { value: 'MR', label: 'MR', title: 'Memory Recall' },
                       { value: 'MS', label: 'MS', title: 'Memory Store' },
                       { value: 'M+', label: 'M+', title: 'Memory Add' },
                       { value: 'C', label: 'C', color: 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40', title: 'Clear' },
                     ].map(btn => (
                       <button
                         key={btn.value}
                         onClick={()=>handleCalcBtn(btn.value)}
                         title={btn.title}
                         className={`w-full h-10 rounded-lg text-sm font-bold transition-all active:scale-95 hover:scale-105 hover:shadow-md ${btn.color || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                       >
                         {btn.label}
                       </button>
                     ))}
                   </div>
                 </div>

                 {/* Main Calculator Grid */}
                 <div className="space-y-2">
                   <div className="grid grid-cols-4 gap-2">
                     {/* Row 1: Parentheses and operations */}
                     {[
                       { value: '(', label: '(' },
                       { value: ')', label: ')' },
                       { value: 'Backspace', label: '⌫', title: 'Backspace' },
                       { value: '÷', label: '÷', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40' },
                     ].map(btn => (
                       <button
                         key={btn.value}
                         onClick={()=>handleCalcBtn(btn.value)}
                         title={btn.title}
                         className={`w-full h-12 rounded-lg text-base font-bold transition-all active:scale-95 hover:scale-105 hover:shadow-md ${btn.color || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                       >
                         {btn.label}
                       </button>
                     ))}
                   </div>

                   {/* Number pad rows */}
                   <div className="grid grid-cols-4 gap-2">
                     {[
                       { value: '7', label: '7' },
                       { value: '8', label: '8' },
                       { value: '9', label: '9' },
                       { value: '×', label: '×', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40' },
                     ].map(btn => (
                       <button
                         key={btn.value}
                         onClick={()=>handleCalcBtn(btn.value)}
                         className={`w-full h-12 rounded-lg text-base font-bold transition-all active:scale-95 hover:scale-105 hover:shadow-md ${btn.color || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                       >
                         {btn.label}
                       </button>
                     ))}
                   </div>

                   <div className="grid grid-cols-4 gap-2">
                     {[
                       { value: '4', label: '4' },
                       { value: '5', label: '5' },
                       { value: '6', label: '6' },
                       { value: '-', label: '-', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40' },
                     ].map(btn => (
                       <button
                         key={btn.value}
                         onClick={()=>handleCalcBtn(btn.value)}
                         className={`w-full h-12 rounded-lg text-base font-bold transition-all active:scale-95 hover:scale-105 hover:shadow-md ${btn.color || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                       >
                         {btn.label}
                       </button>
                     ))}
                   </div>

                   <div className="grid grid-cols-4 gap-2">
                     {[
                       { value: '1', label: '1' },
                       { value: '2', label: '2' },
                       { value: '3', label: '3' },
                       { value: '+', label: '+', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40' },
                     ].map(btn => (
                       <button
                         key={btn.value}
                         onClick={()=>handleCalcBtn(btn.value)}
                         className={`w-full h-12 rounded-lg text-base font-bold transition-all active:scale-95 hover:scale-105 hover:shadow-md ${btn.color || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                       >
                         {btn.label}
                       </button>
                     ))}
                   </div>

                   {/* Bottom row: 0, decimal, and equals */}
                   <div className="grid grid-cols-3 gap-2">
                     <button
                       onClick={()=>handleCalcBtn('0')}
                       className="h-12 rounded-lg text-base font-bold transition-all active:scale-95 hover:scale-105 hover:shadow-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                     >
                       0
                     </button>
                     <button
                       onClick={()=>handleCalcBtn('.')}
                       className="h-12 rounded-lg text-base font-bold transition-all active:scale-95 hover:scale-105 hover:shadow-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                     >
                       .
                     </button>
                     <button
                       onClick={()=>handleCalcBtn('=')}
                       className="col-span-2 h-12 rounded-lg text-base font-bold transition-all active:scale-95 hover:scale-105 hover:shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md"
                     >
                       =
                     </button>
                   </div>
                 </div>

                 {/* Quick Functions */}
                 <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                   <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 tracking-widest">Quick Functions</div>
                   <div className="grid grid-cols-3 gap-2">
                     {[
                       { label: '% of', action: () => handleCalcBtn('/100*'), title: 'Percentage of' },
                       { label: '√', action: () => handleCalcBtn('Math.sqrt('), title: 'Square Root' },
                       { label: 'x²', action: () => handleCalcBtn('**2'), title: 'Square' },
                     ].map((preset, index) => (
                       <button
                         key={index}
                         onClick={preset.action}
                         title={preset.title}
                         className="w-full h-10 rounded-lg text-sm font-bold transition-all active:scale-95 hover:scale-105 hover:shadow-md bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/40"
                       >
                         {preset.label}
                       </button>
                     ))}
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </main>

      <footer className="max-w-7xl mx-auto mt-20 text-center border-t border-blue-600 dark:border-orange-700 pt-10 pb-10">
        <div className="flex flex-col items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Trade Expeditors USA, Inc. / TEU Global</p>
          <div className="bg-white p-2 rounded-xl shadow-sm border-b border-r border-slate-50 opacity-40 hover:opacity-100 hover:scale-105 transition-all duration-300"><img src={adminSettings.logo} alt="Logo" className="h-8 grayscale hover:grayscale-0 transition-all duration-500" onError={(e)=>(e.target as any).src='https://placehold.co/100x40/004B8D/FFFFFF?text=Brand+Logo'}/></div>
          <p className="text-[15px] font-bold text-slate-400 uppercase">&copy; {new Date().getFullYear()} All Rights Reserved. Engineered by JUNAID ABBASI</p>
        </div>
          </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
        .animate-ship-travel {
          animation: ship-travel 1.2s ease-in-out infinite;
        }
        @keyframes ship-travel {
          0% { transform: translateX(-30px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(30px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default App;