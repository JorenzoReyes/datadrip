'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import Header from '../components/Header';
import { useAuth } from '../contexts/auth';
import ReactMarkdown from 'react-markdown';

interface Insight {
  id: string;
  type: 'promotion' | 'inventory' | 'marketing' | 'trend' | 'feedback' | 'forecast';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  suggestedAction: string;
  timeline: string;
  supportingData: string;
  dismissed?: boolean;
}

interface ChatMessage {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
  model?: 'gemini-2.5-flash' | 'gemini-2.5-pro';
}

export default function InsightsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
      return;
    }
  }, [user, isLoading, router]);

  

  // Local state for embedded insights and chat
  const [insights, setInsights] = useState<Insight[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<string>('');
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [inputMode, setInputMode] = useState<'dropdown' | 'custom'>('dropdown');
  const [selectedModel, setSelectedModel] = useState<'gemini-2.5-flash' | 'gemini-2.5-pro'>('gemini-2.5-flash');
  const [chatHeight, setChatHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [currentTimeline, setCurrentTimeline] = useState<string | null>(null);

  // Get user-specific localStorage key
  const getInsightsStorageKey = useCallback(() => {
    if (!user?.user_id) return null;
    return `businessInsights_user_${user.user_id}`;
  }, [user?.user_id]);

  // Load insights from localStorage on mount (user-specific)
  useEffect(() => {
    if (!user?.user_id) return;
    
    const storageKey = getInsightsStorageKey();
    if (!storageKey) return;

    const savedInsights = localStorage.getItem(storageKey);
    if (savedInsights) {
      try {
        const parsed = JSON.parse(savedInsights);
        setInsights(parsed);
      } catch (error) {
        console.error('Failed to parse saved insights:', error);
        // Clear corrupted data
        localStorage.removeItem(storageKey);
      }
    }
  }, [user?.user_id, getInsightsStorageKey]);

  // Load current timeline on mount
  useEffect(() => {
    const timelineContext = localStorage.getItem('dashboardTimeline');
    if (timelineContext) {
      try {
        const parsed = JSON.parse(timelineContext);
        setCurrentTimeline(parsed.label);
      } catch (e) {
        console.warn('Failed to parse timeline context:', e);
      }
    }
  }, []);

  const insightOptions = [
    { value: 'customer-segment', label: 'Customer Segment', shortLabel: 'Customer Segment' },
    { value: 'sale-trends', label: 'Sale Trends', shortLabel: 'Sale Trends' },
    { value: 'inventory-forecasting', label: 'Inventory Forecasting', shortLabel: 'Inventory Forecasting' },
    { value: 'product-performance', label: 'Product Performance', shortLabel: 'Product Performance' }
  ];

  // Fetch AI-generated insights based on real user data
  const fetchBusinessInsights = async () => {
    if (!user?.user_id) return;

    setIsLoadingInsights(true);
    setInsightsError(null);

    try {
      // Get current timeline context from dashboard
      const timelineContext = localStorage.getItem('dashboardTimeline');
      let parsedTimeline = null;
      if (timelineContext) {
        try {
          parsedTimeline = JSON.parse(timelineContext);
          setCurrentTimeline(parsedTimeline.label);
        } catch (e) {
          console.warn('Failed to parse timeline context:', e);
        }
      }

      const response = await fetch('/api/ai/business-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.user_id,
          timeline: parsedTimeline
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      
      if (data.insights && Array.isArray(data.insights)) {
        // Sort insights by priority and confidence
        const sortedInsights = sortInsightsByPriorityAndConfidence(data.insights);
        setInsights(sortedInsights);
        
        // Save to user-specific localStorage
        const storageKey = getInsightsStorageKey();
        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(sortedInsights));
        }
      } else {
        throw new Error('Invalid insights data');
      }
    } catch (error) {
      console.error('Error fetching business insights:', error);
      setInsightsError('Failed to generate insights. Please try again.');
      // Set empty insights on error
      setInsights([]);
      
      // Remove user-specific data
      const storageKey = getInsightsStorageKey();
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Sort insights by priority (high, medium, low) and then by confidence
  const sortInsightsByPriorityAndConfidence = (insightsList: Insight[]): Insight[] => {
    const priorityOrder: { [key: string]: number } = {
      'high': 1,
      'medium': 2,
      'low': 3
    };

    return [...insightsList].sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by confidence (higher first)
      return b.confidence - a.confidence;
    });
  };

  useEffect(() => {
    if (!user) return;
    
    // Clear insights when user changes (security measure)
    setInsights([]);
    setInsightsError(null);
    
    // Only set welcome message, don't auto-fetch insights
    // User must click Refresh button to generate insights
    setMessages([{
      id: 'welcome',
      type: 'ai',
      content: `Hello ${user?.fname || 'there'}! 👋 I'm your AI business assistant. I've analyzed your data and found some insights that could help grow your business.`,
      timestamp: new Date()
    }]);
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if we have either a selected insight or custom question
    if (inputMode === 'dropdown' && !selectedInsight) return;
    if (inputMode === 'custom' && !customQuestion.trim()) return;

    let userMessage: ChatMessage;
    let topicToSend: string;

    if (inputMode === 'dropdown') {
      const selectedOption = insightOptions.find(option => option.value === selectedInsight);
      if (!selectedOption) return;
      
      userMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: `Requested: ${selectedOption.shortLabel}`,
        timestamp: new Date()
      };
      topicToSend = selectedInsight;
    } else {
      userMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: customQuestion,
        timestamp: new Date()
      };
      topicToSend = 'custom';
    }

    setMessages(prev => [...prev, userMessage]);
    setSelectedInsight('');
    setCustomQuestion('');
    setIsTyping(true);

    try {
      // Get current timeline context from dashboard
      const timelineContext = localStorage.getItem('dashboardTimeline');
      let parsedTimeline = null;
      if (timelineContext) {
        try {
          parsedTimeline = JSON.parse(timelineContext);
        } catch (e) {
          console.warn('Failed to parse timeline context:', e);
        }
      }

      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicToSend,
          customQuestion: inputMode === 'custom' ? customQuestion : undefined,
          history: messages.map(m => ({ type: m.type, content: m.content })),
          userId: user?.user_id,
          model: selectedModel,
          businessContext: {
            // Additional context can be added here if needed
            userEmail: user?.email,
            userName: user?.fname + ' ' + user?.lname,
            timeline: parsedTimeline
          }
        })
      });

      const data = await response.json();
      const content = data?.content || (inputMode === 'dropdown' ? generateAIResponse(selectedInsight) : 'Sorry, I could not generate a response for your custom question.');

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content,
        timestamp: new Date(),
        model: selectedModel
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I could not reach the insight service. ' + (inputMode === 'dropdown' ? 'Showing a generated summary instead.\n\n' + generateAIResponse(selectedInsight) : 'Please try again later.'),
        timestamp: new Date(),
        model: selectedModel
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateAIResponse = (selected: string): string => {
    switch (selected) {
      case 'customer-segment':
        return `## 📊 Customer Happiness Report\n\n🎉 **8 out of 10 customers love your products!**\n\n### Top 3 Customer Insights:\n- **Age Group 25-34** → 85% positive reviews (happiest customers)\n- **Mobile App Users** → 23% higher satisfaction than website\n- **Delivery Times** → Top concern in negative feedback\n\n### Quick Actions:\n- ✅ Add express shipping options\n- ✅ Optimize mobile experience\n- ✅ Use positive feedback in marketing\n\n📌 **Bottom Line:** You're doing great! Fix delivery speed for even happier customers.`;
      case 'sale-trends':
        return `## 📈 Sales Success Story\n\n**This Month:** $45,678 (+$7,000 vs last month)  \n**Orders:** 1,234 (+200 vs last month)  \n**Average:** $37 per order\n\n### Top 3 Peak Shopping Times:\n- **7-9 PM** → 32% of daily sales (dinner time)\n- **Tuesday & Thursday** → 28% higher than weekend\n- **Mobile Orders** → 7 out of 10 orders\n\n### Quick Wins:\n- ✅ Run evening promotions (7-9 PM)\n- ✅ Optimize mobile checkout\n- ✅ Stock up for holiday season\n\n📌 **Bottom Line:** Sales growing nicely! Focus on evening promotions.`;
      case 'inventory-forecasting':
        return `## 📦 Stock Alert - Action Required\n\n### Current Status:\n- 5 products running low on stock\n- 2 products completely sold out\n- 3 products overstocked\n\n### Top 3 Critical Items:\n- **Wireless Earbuds** → Only 12 left (usually 60)\n- **Fitness Watch** → Only 8 left (usually 50)\n- **Portable Charger** → Only 15 left (usually 60)\n\n### Action Plan:\n- ✅ **Today:** Restock 5 critical items\n- ✅ **This Week:** Order 8 fast-moving products\n- ✅ **This Month:** Stop ordering overstocked items\n\n📌 **Bottom Line:** Restock popular items quickly or lose sales!`;
      case 'product-performance':
        return `## 🏆 Your Top 3 Money Makers\n\n### 🥇 Wireless Earbuds\n- 💰 **Revenue:** $18,240 (28% of total)\n- 📦 **Sales:** 456 units (+34%)\n- ⭐ **Rating:** 4.8/5 stars\n- 💵 **Profit:** 42% margin\n\n### 🥈 Fitness Watch\n- 💰 **Revenue:** $15,560 (24% of total)\n- 📦 **Sales:** 389 units (+21%)\n- ⭐ **Rating:** 4.6/5 stars\n- 💵 **Profit:** 38% margin\n\n### 🥉 Portable Charger\n- 💰 **Revenue:** $9,360 (14% of total)\n- 📦 **Sales:** 312 units (+18%)\n- ⭐ **Rating:** 4.7/5 stars\n- 💵 **Profit:** 35% margin\n\n### Smart Moves:\n- ✅ Increase marketing for top 3\n- ✅ Create bundle deals\n- ✅ Expand product line\n\n📌 **Bottom Line:** These 3 bring in 66% of your money!`;
      default:
        return "I can help you understand your customers, sales patterns, inventory needs, and product performance in simple terms. Just pick what you'd like to know from the dropdown!";
    }
  };

  const dismissInsight = (insightId: string) => {
    const updatedInsights = insights.map(insight => 
      insight.id === insightId 
        ? { ...insight, dismissed: true }
        : insight
    );
    setInsights(updatedInsights);
    
    // Update user-specific localStorage
    const storageKey = getInsightsStorageKey();
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(updatedInsights));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 border-red-400';
      case 'medium': return 'text-yellow-400 border-yellow-400';
      case 'low': return 'text-green-400 border-green-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'promotion': return '🎯';
      case 'inventory': return '📦';
      case 'marketing': return '📢';
      case 'trend': return '📈';
      case 'feedback': return '💬';
      case 'forecast': return '🔮';
      default: return '💡';
    }
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const container = document.querySelector('[data-embedded-chat]') as HTMLElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newHeight = e.clientY - rect.top;
    const constrainedHeight = Math.max(256, Math.min(512, newHeight));
    setChatHeight(constrainedHeight);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl font-medium">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl font-medium">Please log in</div>
      </div>
    );
  }

  const roles = user.roles || (user.role ? [user.role] : []);
  const isAdmin = roles.includes('admin') || roles.includes('system_admin');
  const canView = !isAdmin; // allow all authenticated non-admin users
  if (!canView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl font-medium">Access denied (Insights)</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header active="insights" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold font-title text-header">Insights</h2>
          <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-xs text-blue-700 font-medium">Powered by:</span>
            <span className="text-sm font-semibold text-blue-600">Gemini 2.5</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Insights list */}
          <section className="bg-white rounded-lg p-4 border border-primary-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <h3 className="text-header font-medium flex items-center">
                  💡 Business Insights
                  <span className="ml-2 text-xs bg-primary-500 text-white px-2 py-1 rounded-full">
                    {insights.filter(i => !i.dismissed).length}
                  </span>
                </h3>
                {currentTimeline && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full border">
                    📅 {currentTimeline}
                  </span>
                )}
              </div>
              <button
                onClick={fetchBusinessInsights}
                disabled={isLoadingInsights}
                className="text-xs bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white px-3 py-1 rounded-lg transition disabled:cursor-not-allowed"
                title="Refresh insights"
              >
                {isLoadingInsights ? '🔄 Generating...' : '🔄 Refresh'}
              </button>
            </div>

            {/* Loading state - show during both initial load and re-generation */}
            {isLoadingInsights && (
              <div className="relative min-h-[500px] flex items-center justify-center">
                {/* Skeleton loader background */}
                <div className="absolute inset-0 space-y-3 opacity-20">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-300 rounded-lg p-4 animate-pulse">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 bg-gray-400 rounded-full"></div>
                          <div className="w-20 h-5 bg-gray-400 rounded-full"></div>
                        </div>
                        <div className="w-5 h-5 bg-gray-400 rounded"></div>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="h-5 bg-gray-400 rounded w-4/5"></div>
                        <div className="h-3 bg-gray-400 rounded w-full"></div>
                        <div className="h-3 bg-gray-400 rounded w-11/12"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-400 rounded w-2/3"></div>
                        <div className="h-3 bg-gray-400 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Perfectly centered loading animation */}
                <div className="relative z-10 flex flex-col items-center space-y-4 bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-lg">
                  {/* Loading dots animation */}
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-base font-medium text-header">Analyzing your business data...</p>
                    <p className="text-xs text-subheader">This may take 10-20 seconds</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error state */}
            {insightsError && !isLoadingInsights && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{insightsError}</p>
                <button
                  onClick={fetchBusinessInsights}
                  className="mt-2 text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Insights list */}
            {!isLoadingInsights && !insightsError && insights.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-700 mb-2">👆 Click the 🔄 Refresh button above to generate AI-powered insights!</p>
                <p className="text-xs text-blue-600">Your personalized insights will appear here based on your actual business data.</p>
              </div>
            )}

            {/* Show count only - hide when loading */}
            {!isLoadingInsights && insights.filter(i => !i.dismissed).length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-subheader">
                  Showing {insights.filter(i => !i.dismissed).length} actionable insights based on your data
                </div>
              </div>
            )}

            {/* Insights list - hide when loading */}
            {!isLoadingInsights && (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {insights.filter(insight => !insight.dismissed).map((insight) => (
                <div key={insight.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getTypeIcon(insight.type)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(insight.priority)}`}>
                        {insight.priority}
                      </span>
                    </div>
                    <button
                      onClick={() => dismissInsight(insight.id)}
                      className="text-subheader hover:text-header text-sm"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                  <h5 className="text-header font-medium text-sm mb-1">{insight.title}</h5>
                  <p className="text-subheader text-xs mb-2">{insight.description}</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-primary-500">🎯</span>
                      <span className="text-header">{insight.suggestedAction}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-yellow-500">⏰</span>
                      <span className="text-header">{insight.timeline}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-green-500">📊</span>
                      <span className="text-header">{insight.confidence}% confidence</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </section>

          {/* Embedded chat */}
          <section data-embedded-chat className="bg-white rounded-lg p-4 border border-primary-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <h3 className="text-header font-medium">💬 Chat with AI</h3>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as 'gemini-2.5-flash' | 'gemini-2.5-pro')}
                  className="text-xs bg-white text-header rounded-lg px-2 py-1 border border-gray-300 focus:border-primary-500 focus:outline-none"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced)</option>
                </select>
              </div>
              <div className="text-xs text-subheader">Resizable</div>
            </div>

            <div className="mb-4 overflow-y-auto" style={{ height: `${chatHeight}px` }}>
              <div className="flex flex-col justify-end min-h-full space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-md p-4 rounded-lg ${message.type === 'user' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-header border border-gray-200'}`}>
                      {message.type === 'ai' ? (
                        <div className="prose prose-sm max-w-none text-sm whitespace-pre-line leading-relaxed">
                          <ReactMarkdown 
                            components={{
                              p: ({children}) => <p className="mb-4 last:mb-0 text-header">{children}</p>,
                              h1: ({children}) => <h1 className="text-base font-semibold mb-3 mt-4 first:mt-0 text-header">{children}</h1>,
                              h2: ({children}) => <h2 className="text-base font-semibold mb-3 mt-4 first:mt-0 text-header">{children}</h2>,
                              h3: ({children}) => <h3 className="text-sm font-semibold mb-2 mt-3 first:mt-0 text-header">{children}</h3>,
                              ul: ({children}) => <ul className="list-disc ml-4 mb-4 space-y-1 text-header">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal ml-4 mb-4 space-y-1 text-header">{children}</ol>,
                              li: ({children}) => <li className="mb-1 text-header">{children}</li>,
                              strong: ({children}) => <strong className="font-semibold text-header">{children}</strong>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                      <div className="flex items-center justify-between mt-4 text-xs opacity-70">
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                        {message.type === 'ai' && message.model && (
                          <span className="ml-2 px-2 py-0.5 bg-white/50 rounded text-xs">
                            {message.model === 'gemini-2.5-flash' ? '⚡ Flash' : '🧠 Pro'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-header border border-gray-200 p-3 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Form section - pushed to bottom */}
            <div className="mt-auto">
              <div 
                className="h-1 bg-primary-200 hover:bg-primary-300 cursor-ns-resize rounded-full mt-2 mb-3 transition-colors"
                onMouseDown={handleResizeStart}
                title="Drag to resize chat height"
              />

              {/* Input Mode Toggle */}
              <div className="flex space-x-2 mb-3">
              <button
                type="button"
                onClick={() => setInputMode('dropdown')}
                className={`px-3 py-1 rounded-lg text-sm transition ${
                  inputMode === 'dropdown' 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Quick Insights
              </button>
              <button
                type="button"
                onClick={() => setInputMode('custom')}
                className={`px-3 py-1 rounded-lg text-sm transition ${
                  inputMode === 'custom' 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Ask Anything
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3">
              {inputMode === 'dropdown' ? (
                <div className="flex space-x-2">
                  <select
                    value={selectedInsight}
                    onChange={(e) => setSelectedInsight(e.target.value)}
                    className="flex-1 bg-white text-header text-sm rounded-lg px-3 py-2 border border-gray-300 focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">Select an insight type...</option>
                    {insightOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.shortLabel}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!selectedInsight}
                    className="bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm transition disabled:cursor-not-allowed"
                  >
                    Generate
                  </button>
                </div>
              ) : (
                <div className="flex space-x-2 items-start">
                  <textarea
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); } }}
                    placeholder="Ask me anything about your shop performance, sales, inventory, customers, etc..."
                    className="flex-1 bg-white text-header text-sm rounded-lg px-3 py-2 border border-gray-300 focus:border-primary-500 focus:outline-none resize-none"
                    rows={3}
                  />
                  <button
                    type="submit"
                    disabled={!customQuestion.trim()}
                    className="bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm transition disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Ask Gemini
                  </button>
                </div>
              )}
            </form>
            </div>
          </section>
        </div>

        {/* AI Disclaimer - Bottom of page */}
        <div className="mt-8">
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-gray-600 text-sm">⚠️</span>
              <div className="text-xs text-gray-700">
                <strong>AI Disclaimer:</strong> Responses may not be 100% accurate as this is an AI system that can make mistakes. 
                Please verify important business decisions with your own analysis and data.
                <br />
                <strong>Current Model:</strong> {selectedModel === 'gemini-2.5-flash' ? 'Gemini 2.5 Flash (Fast)' : 'Gemini 2.5 Pro (Advanced)'}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
