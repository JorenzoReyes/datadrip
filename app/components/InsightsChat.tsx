'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { useSidechat } from '../contexts/SidechatContext';
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
  insights?: Insight[];
}

export default function InsightsChat() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const { isOpen, setIsOpen } = useSidechat();
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [chatHeight, setChatHeight] = useState(256); // Default height (max-h-64 = 256px)
  const [isResizing, setIsResizing] = useState(false);

  // Dropdown options for insights
  const insightOptions = [
    {
      value: 'customer-segment',
      label: 'Customer Segment: Sentiment analysis on customer reviews and comments',
      shortLabel: 'Customer Segment'
    },
    {
      value: 'sale-trends',
      label: 'Sale Trends: Predictive analytics for sales trends',
      shortLabel: 'Sale Trends'
    },
    {
      value: 'inventory-forecasting',
      label: 'Inventory Forecasting: Identifies whether current stock needs restocking',
      shortLabel: 'Inventory Forecasting'
    },
    {
      value: 'product-performance',
      label: 'Product Performance: Provide a summarized information on the top selling product',
      shortLabel: 'Product Performance'
    }
  ];

  // Sample insights data - moved inside useEffect to avoid dependency issues
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
    // Initialize with welcome message and insights
    const sampleInsights = getSampleInsights();
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'ai',
      content: `Hello ${user?.firstName || 'there'}! 👋 I'm your AI business assistant. I've analyzed your data and found some insights that could help grow your business.`,
      timestamp: new Date(),
      insights: sampleInsights
    };

    setMessages([welcomeMessage]);
    setInsights(sampleInsights);
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

    // Simulate AI response
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

         const generateAIResponse = (selectedInsight: string): string => {
       switch (selectedInsight) {
         case 'customer-segment':
           return `## 📊 Customer Happiness Report

🎉 **8 out of 10 customers love your products!**

### Top 3 Customer Insights:
- **Age Group 25-34** → 85% positive reviews (happiest customers)
- **Mobile App Users** → 23% higher satisfaction than website
- **Delivery Times** → Top concern in negative feedback

### Quick Actions:
- ✅ Add express shipping options
- ✅ Optimize mobile experience
- ✅ Use positive feedback in marketing

📌 **Bottom Line:** You're doing great! Fix delivery speed for even happier customers.`;
        
         case 'sale-trends':
           return `## 📈 Sales Success Story

**This Month:** $45,678 (+$7,000 vs last month)  
**Orders:** 1,234 (+200 vs last month)  
**Average:** $37 per order

### Top 3 Peak Shopping Times:
- **7-9 PM** → 32% of daily sales (dinner time)
- **Tuesday & Thursday** → 28% higher than weekend
- **Mobile Orders** → 7 out of 10 orders

### Quick Wins:
- ✅ Run evening promotions (7-9 PM)
- ✅ Optimize mobile checkout
- ✅ Stock up for holiday season

📌 **Bottom Line:** Sales growing nicely! Focus on evening promotions.`;
        
         case 'inventory-forecasting':
           return `## 📦 Stock Alert - Action Required

### Current Status:
- 5 products running low on stock
- 2 products completely sold out
- 3 products overstocked

### Top 3 Critical Items:
- **Wireless Earbuds** → Only 12 left (usually 60)
- **Fitness Watch** → Only 8 left (usually 50)
- **Portable Charger** → Only 15 left (usually 60)

### Action Plan:
- ✅ **Today:** Restock 5 critical items
- ✅ **This Week:** Order 8 fast-moving products
- ✅ **This Month:** Stop ordering overstocked items

📌 **Bottom Line:** Restock popular items quickly or lose sales!`;
        
         case 'product-performance':
           return `## 🏆 Your Top 3 Money Makers

### 🥇 Wireless Earbuds
- 💰 **Revenue:** $18,240 (28% of total)
- 📦 **Sales:** 456 units (+34%)
- ⭐ **Rating:** 4.8/5 stars
- 💵 **Profit:** 42% margin

### 🥈 Fitness Watch
- 💰 **Revenue:** $15,560 (24% of total)
- 📦 **Sales:** 389 units (+21%)
- ⭐ **Rating:** 4.6/5 stars
- 💵 **Profit:** 38% margin

### 🥉 Portable Charger
- 💰 **Revenue:** $9,360 (14% of total)
- 📦 **Sales:** 312 units (+18%)
- ⭐ **Rating:** 4.7/5 stars
- 💵 **Profit:** 35% margin

### Smart Moves:
- ✅ Increase marketing for top 3
- ✅ Create bundle deals
- ✅ Expand product line

📌 **Bottom Line:** These 3 bring in 66% of your money!`;
        
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
    
    const container = document.querySelector('[data-insights-chat]') as HTMLElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const newHeight = e.clientY - rect.top;
    
    // Constrain height between 256px (min) and 512px (2x max)
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

  // Don't render if user is not logged in, still loading, or on restricted pages
  if (isLoading || !user) {
    return null;
  }

  // Only show on user dashboard and settings pages, not on admin pages or public pages
  const allowedPaths = ['/dashboard', '/settings'];
  if (!allowedPaths.includes(pathname)) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed right-4 bottom-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          title="Open AI Insights"
        >
          🤖
        </button>
      </div>
    );
  }



  return (
    <div 
      data-insights-chat
      className={`fixed right-0 top-0 h-full bg-gray-900/95 backdrop-blur-md border-l border-purple-500/30 transition-all duration-300 ${
        isOpen ? 'w-[28rem] lg:w-[28rem] md:w-80 sm:w-72' : 'w-0'
      } z-40`}
    >
      {isOpen && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-purple-600/20 p-4 border-b border-purple-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                  🤖
                </div>
                <div>
                  <h3 className="text-white font-semibold">AI Business Assistant</h3>
                  <p className="text-purple-200 text-sm">Powered by DataDrip</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-purple-200 hover:text-white transition"
                  title="Minimize"
                >
                  ➖
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-purple-200 hover:text-white transition"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

                       {/* Insights Section */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
               <div className="bg-black/40 rounded-lg p-4 border border-purple-500/30">
                 <h4 className="text-white font-medium mb-3 flex items-center">
                   💡 Business Insights
                   <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                     {insights.filter(i => !i.dismissed).length}
                   </span>
                 </h4>
                 
                 <div className="space-y-3">
                   {insights.filter(insight => !insight.dismissed).map((insight) => (
                     <div key={insight.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                       <div className="flex items-start justify-between mb-2">
                         <div className="flex items-center space-x-2">
                           <span className="text-lg">{getTypeIcon(insight.type)}</span>
                           <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(insight.priority)}`}>
                             {insight.priority}
                           </span>
                         </div>
                         <button
                           onClick={() => dismissInsight(insight.id)}
                           className="text-gray-400 hover:text-white text-sm"
                           title="Dismiss"
                         >
                           ✕
                         </button>
                       </div>
                       
                       <h5 className="text-white font-medium text-sm mb-1">{insight.title}</h5>
                       <p className="text-gray-300 text-xs mb-2">{insight.description}</p>
                       
                       {/* Visual Action Items */}
                       <div className="mt-3 space-y-2">
                         <div className="flex items-center space-x-2 text-xs">
                           <span className="text-purple-400">🎯</span>
                           <span className="text-white">{insight.suggestedAction}</span>
                         </div>
                         <div className="flex items-center space-x-2 text-xs">
                           <span className="text-yellow-400">⏰</span>
                           <span className="text-white">{insight.timeline}</span>
                         </div>
                         <div className="flex items-center space-x-2 text-xs">
                           <span className="text-green-400">📊</span>
                           <span className="text-white">{insight.confidence}% confidence</span>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

                         {/* Chat Messages */}
             <div className="bg-black/40 rounded-lg p-4 border border-purple-500/30">
               <div className="flex items-center justify-between mb-3">
                 <h4 className="text-white font-medium">💬 Chat with AI</h4>
                 <div className="text-xs text-gray-400">Resizable</div>
               </div>
               
               <div 
                 className="space-y-3 mb-4 overflow-y-auto"
                 style={{ height: `${chatHeight}px` }}
               >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                                         <div
                       className={`max-w-xs p-3 rounded-lg ${
                         message.type === 'user'
                           ? 'bg-purple-600 text-white'
                           : 'bg-gray-700 text-gray-200'
                       }`}
                     >
                       {message.type === 'ai' ? (
                         <div className="prose prose-sm max-w-none prose-headings:text-gray-200 prose-p:text-gray-200 prose-strong:text-white prose-ul:text-gray-200 prose-li:text-gray-200">
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
                    <div className="bg-gray-700 text-gray-200 p-3 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                                 <div ref={messagesEndRef} />
               </div>
               
               {/* Resize Handle */}
               <div 
                 className="h-1 bg-purple-500/30 hover:bg-purple-500/50 cursor-ns-resize rounded-full mt-2 transition-colors"
                 onMouseDown={handleResizeStart}
                 title="Drag to resize chat height"
               />

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <select
                  value={selectedInsight}
                  onChange={(e) => setSelectedInsight(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none"
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
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition disabled:cursor-not-allowed"
                >
                  Generate
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-4 top-4 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-50"
          title="Open AI Insights"
        >
          🤖
        </button>
      )}
    </div>
  );
}
