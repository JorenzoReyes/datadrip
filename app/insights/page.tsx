'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/auth';
import ReactMarkdown from 'react-markdown';

interface Insight {
  id: string;
  type: 'promotion' | 'inventory' | 'marketing' | 'trend' | 'feedback';
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
}

export default function InsightsPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
      return;
    }
  }, [user, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Local state for embedded insights and chat
  const [insights, setInsights] = useState<Insight[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<string>('');
  const [chatHeight, setChatHeight] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const insightOptions = [
    { value: 'customer-segment', label: 'Customer Segment', shortLabel: 'Customer Segment' },
    { value: 'sale-trends', label: 'Sale Trends', shortLabel: 'Sale Trends' },
    { value: 'inventory-forecasting', label: 'Inventory Forecasting', shortLabel: 'Inventory Forecasting' },
    { value: 'product-performance', label: 'Product Performance', shortLabel: 'Product Performance' }
  ];

  const getSampleInsights = (): Insight[] => [
    {
      id: '1',
      type: 'promotion',
      title: 'Holiday Season Promotion Opportunity',
      description: 'Based on last year\'s data, December shows 45% higher conversion rates. Consider running a holiday promotion campaign.',
      confidence: 87,
      priority: 'high',
      suggestedAction: 'Launch holiday promotion campaign with 15-20% discount',
      timeline: 'Next 2 weeks',
      supportingData: 'December 2023: 45% higher conversion, 32% more orders'
    },
    {
      id: '2',
      type: 'inventory',
      title: 'Low Stock Alert for Top Products',
      description: 'Your best-selling items are running low on inventory. Restock soon to avoid losing sales.',
      confidence: 92,
      priority: 'high',
      suggestedAction: 'Restock top 5 products within 1 week',
      timeline: 'Immediate',
      supportingData: '3 products below 20% stock level, 2 products out of stock'
    },
    {
      id: '3',
      type: 'trend',
      title: 'Mobile Shopping Trend Increase',
      description: 'Mobile orders have increased by 28% this month. Consider optimizing your mobile experience.',
      confidence: 78,
      priority: 'medium',
      suggestedAction: 'Review and optimize mobile checkout process',
      timeline: 'Next 2 weeks',
      supportingData: 'Mobile orders: +28% this month, 65% of total orders'
    },
    {
      id: '4',
      type: 'feedback',
      title: 'Customer Satisfaction Improvement',
      description: 'Customer reviews show concerns about delivery times. Consider offering express shipping options.',
      confidence: 81,
      priority: 'medium',
      suggestedAction: 'Introduce express shipping and improve delivery tracking',
      timeline: 'Next month',
      supportingData: 'Delivery time complaints: 23% of negative reviews'
    }
  ];

  useEffect(() => {
    if (!user) return;
    const sampleInsights = getSampleInsights();
    setInsights(sampleInsights);
    setMessages([{
      id: 'welcome',
      type: 'ai',
      content: `Hello ${user?.fname || 'there'}! 👋 I\'m your AI business assistant. I\'ve analyzed your data and found some insights that could help grow your business.`,
      timestamp: new Date()
    }]);
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInsight) return;

    const selectedOption = insightOptions.find(option => option.value === selectedInsight);
    if (!selectedOption) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: `Requested: ${selectedOption.shortLabel}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setSelectedInsight('');
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse = generateAIResponse(selectedInsight);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
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
    setInsights(prev => prev.map(insight => 
      insight.id === insightId 
        ? { ...insight, dismissed: true }
        : insight
    ));
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

  const canView = (user.permissions || []).includes('view_insights');
  if (!canView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-header text-xl font-medium">Access denied (Insights)</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-2xl font-bold font-title text-header hover:text-primary-600 transition">
                DataDrip
              </Link>
              <nav className="hidden md:flex space-x-6">
                <a href="/dashboard" className="text-subheader hover:text-header transition">Dashboard</a>
                <a href="/products" className="text-subheader hover:text-header transition">Products</a>
                <a href="/insights" className="text-header font-medium">Insights</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/settings')}
                className="p-2 text-gray-600 hover:text-header hover:bg-gray-100 rounded-lg transition"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">U</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-header hover:bg-gray-100 rounded-lg transition font-medium"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold font-title text-header mb-6">Insights</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Insights list */}
          <section className="bg-white rounded-lg p-4 border border-primary-200 shadow-sm">
            <h3 className="text-header font-medium mb-3 flex items-center">
              💡 Business Insights
              <span className="ml-2 text-xs bg-primary-500 text-white px-2 py-1 rounded-full">
                {insights.filter(i => !i.dismissed).length}
              </span>
            </h3>
            <div className="space-y-3">
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
          </section>

          {/* Embedded chat */}
          <section data-embedded-chat className="bg-white rounded-lg p-4 border border-primary-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-header font-medium">💬 Chat with AI</h3>
              <div className="text-xs text-subheader">Resizable</div>
            </div>

            <div className="space-y-3 mb-4 overflow-y-auto" style={{ height: `${chatHeight}px` }}>
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs p-3 rounded-lg ${message.type === 'user' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-header border border-gray-200'}`}>
                    {message.type === 'ai' ? (
                      <div className="prose prose-sm max-w-none prose-headings:text-header prose-p:text-header prose-strong:text-header prose-ul:text-header prose-li:text-header">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
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

            <div 
              className="h-1 bg-primary-200 hover:bg-primary-300 cursor-ns-resize rounded-full mt-2 transition-colors"
              onMouseDown={handleResizeStart}
              title="Drag to resize chat height"
            />

            <form onSubmit={handleSendMessage} className="flex space-x-2 mt-4">
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
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
