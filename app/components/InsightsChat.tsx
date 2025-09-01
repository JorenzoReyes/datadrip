'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePathname } from 'next/navigation';

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
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [insights, setInsights] = useState<Insight[]>([]);

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
    if (!userInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(userInput);
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

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('promotion') || input.includes('discount')) {
      return "Based on your sales data, I recommend running promotions during weekends and holidays when customer engagement is highest. Consider offering 15-20% discounts on your top-performing products.";
    } else if (input.includes('inventory') || input.includes('stock')) {
      return "Your inventory analysis shows that 3 products are running low. I recommend restocking these items within the next week to maintain sales momentum.";
    } else if (input.includes('trend') || input.includes('analysis')) {
      return "Current trends show increasing mobile shopping (up 28% this month) and higher conversion rates during evening hours. Consider optimizing your mobile experience and scheduling promotions accordingly.";
    } else if (input.includes('customer') || input.includes('feedback')) {
      return "Customer feedback analysis reveals concerns about delivery times and product quality. Consider improving your shipping options and product descriptions to address these issues.";
    } else {
      return "I can help you with business insights, promotion strategies, inventory management, trend analysis, and customer feedback. What specific area would you like to explore?";
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
    <div className={`fixed right-0 top-0 h-full bg-gray-900/95 backdrop-blur-md border-l border-purple-500/30 transition-all duration-300 ${
      isOpen ? 'w-96' : 'w-0'
    } z-40`}>
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
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Action:</span>
                        <span className="text-white">{insight.suggestedAction}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Timeline:</span>
                        <span className="text-white">{insight.timeline}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Confidence:</span>
                        <span className="text-white">{insight.confidence}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="bg-black/40 rounded-lg p-4 border border-purple-500/30">
              <h4 className="text-white font-medium mb-3">💬 Chat with AI</h4>
              
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
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
                      <p className="text-sm">{message.content}</p>
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

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask about your business..."
                  className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition disabled:cursor-not-allowed"
                >
                  Send
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
