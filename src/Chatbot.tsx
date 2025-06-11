import { useEffect, useState, useRef } from 'react';
import "./index.css"
import { UserIcon } from 'lucide-react';
import minusIcon from './assets/minus-icons.png';
import sendIcon from './assets/send.png';
import aiSparkChatbotAlt from './assets/ai-spark-chatbot-alt.png';
const apiUrl = 'https://wellnexai.com/api';

interface Message {
  text: string
  isUser: boolean
  nextSteps?: string[]
}

interface ChatbotTheme {
  data: {
    themeColor: string;
    logo: string;
    name: string;
    website_url: string;
  }
}

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  value?: boolean;
}

interface ChatResponse {
  sessionId: string;
  question?: string;
  isLastQuestion?: boolean;
  isComplete?: boolean;
  recommendation?: string;
  message?: string;
  clarification?: string;
  messages?: Array<{
    type: string;
    content: string;
    isLastQuestion?: boolean;
  }>;
  suggestedServices?: string[];
  nextSteps?: string[];
  currentQuestion?: string;
  needsForm?: boolean;
  formFields?: FormField[];
  greeting?: string;
  data?: {
    isSetupIncomplete?: boolean;
    contactInfo?: string;
  }
  sessionEnded: boolean;
}

interface FormData {
  [key: string]: string | boolean;
}

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [themeColor, setThemeColor] = useState('#007bff'); // Default color
  const [logo, setLogo] = useState('');
  const [name, setName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [isChatComplete, setIsChatComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<FormData>({});
  const [formError, setFormError] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [isLoading]);

  useEffect(() => {
    const fetchThemeColor = async () => {
      try {
        const storedBusinessId = sessionStorage.getItem('wellnex_business_id');
        if (storedBusinessId) {
          const response = await fetch(`${apiUrl}/chatbot/getChatBotDetail`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ businessId: storedBusinessId }),
          });

          const data = await response.json();

          if (!data.status) {
            setMessages([{
              text: "Sorry, this chatbot is currently unavailable. Please contact the business administrator for assistance.",
              isUser: false
            }]);
            setIsChatComplete(true);
            return;
          }

          if (data.data) {
            if (data.data.themeColor) {
              setThemeColor(data.data.themeColor);
            }
            if (data.data.logo) {
              setLogo(data.data.logo);
            }
            if (data.data.name) {
              setName(data.data.name);
            }
            // Show welcome popup when theme is successfully loaded
            setShowWelcomePopup(true);
          }
        }
      } catch (error) {
        console.error('Error fetching theme color:', error);
      }
    };
    fetchThemeColor();
  }, []);

  useEffect(() => {
    const startChat = async () => {
      if (isOpen) {
        try {
          const storedBusinessId = sessionStorage.getItem('wellnex_business_id');

          if (storedBusinessId) {
            const response = await fetch(`${apiUrl}/chatbot/start-chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ businessId: storedBusinessId }),
            });

            if (response.ok) {
              const data: ChatResponse = await response.json();
              console.log(data);

              if (data?.data?.isSetupIncomplete) {
                setMessages([{
                  text: `${data.messages}\n\nContact: ${data.data.contactInfo}`,
                  isUser: false
                }]);
                setIsChatComplete(true);
                return;
              }

              setSessionId(data.sessionId);

              if (data.messages && Array.isArray(data.messages)) {
                const formattedMessages = data.messages.map(msg => ({
                  text: msg.content,
                  isUser: false
                }));
                setMessages(formattedMessages);
              } else if (data.greeting || data.question) {
                const newMsgs: Message[] = [];
                if (data.greeting) newMsgs.push({ text: data.greeting, isUser: false });
                if (data.question) newMsgs.push({ text: data.question, isUser: false });
                setMessages(newMsgs);
              }
              if (data.isComplete && data.recommendation) {
                setIsChatComplete(true);
              }
              if (data.formFields) {
                setFormFields(data.formFields);
                setIsChatComplete(true);
              }
            }
          }
        } catch (error) {
          console.error('Error starting chat:', error);
        }
      }
    };
    startChat();
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (inputValue.trim() && !isChatComplete) {
      const answerValue = inputValue
      const userMsg = { text: inputValue, isUser: true };
      setMessages(prev => [...prev, userMsg]);
      setIsLoading(true);

      try {
        setInputValue("");
        const response = await fetch(`${apiUrl}/chatbot/submit-answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, answer: answerValue }),
        });

        if (response.ok) {
          const data: ChatResponse = await response.json();

          // Process updated "message" array
          if (data.messages && Array.isArray(data.messages)) {
            const botMessages = data.messages.map(msg => ({
              text: msg.content,
              isUser: false
            }));
            setMessages(prev => [...prev, ...botMessages]);
          }
          if (data.nextSteps && data.nextSteps.length > 0) {
            setMessages(prev => [...prev, {
              text: "Please select an option:",
              isUser: false,
              nextSteps: data.nextSteps
            }]);
          }
          if (data.isComplete && data.recommendation) {
            setIsChatComplete(true);
          }

          if (data.formFields) {
            setFormFields(data.formFields);
            setIsChatComplete(true);
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsLoading(true)
      const response = await fetch(`${apiUrl}/chatbot/store-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          formData: formData
        })
      });

      const data = await response.json();
      if (data.status) {
        setMessages(prev => [...prev, {
          text: "Thank you! A specialist will contact you shortly.",
          isUser: false
        }]);
        setFormFields([]);
        setFormData({});
      }
      console.log(data, response);
      setFormError(data.error && data.error.includes("Lead validation failed") ? 'Please fill valid details.' : "Something went wrong.")

    } catch (error) {
      console.error('Error:', error);
      setFormError("Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNextStep = async (step: string) => {
    setMessages(prev => [...prev, { text: step, isUser: true }]);
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/chatbot/handle-consultation-choice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          choice: step
        }),
      });

      if (response.ok) {
        const data: ChatResponse = await response.json();

        // Handle form response
        if (data.needsForm) {
          const messageText = data.message;
          if (messageText) {
            setMessages(prev => [...prev, {
              text: messageText,
              isUser: false
            }]);
          }
          if (data.formFields) {
            setFormFields(data.formFields);
            setIsChatComplete(true);
          }
          return;
        }

        if (data.messages && Array.isArray(data.messages)) {
          const botMessages = data.messages.map(msg => ({
            text: msg.content,
            isUser: false
          }));
          setMessages(prev => [...prev, ...botMessages]);
        }

        if (data.nextSteps && data.nextSteps.length > 0) {
          setMessages(prev => [...prev, {
            text: "Please select an option:",
            isUser: false,
            nextSteps: data.nextSteps
          }]);
        }

        if (data.isComplete) {
          setIsChatComplete(true);
        }
        if (data.sessionEnded) {
          setMessages(prev => [...prev, {
            text: data.message ?? 'Thank you',
            isUser: false
          }])
        }
      }
    } catch (error) {
      console.error('Error handling consultation choice:', error);
      setMessages(prev => [...prev, {
        text: "Sorry, there was an error processing your choice. Please try again.",
        isUser: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Welcome Popup */}
      {showWelcomePopup && !isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 90,
          right: 60,
          background: '#DEE2E6',
          padding: '15px 20px',
          borderRadius: '10px 10px 0 10px',
          zIndex: 1002,
          maxWidth: '300px',
          animation: 'fadeInOut 5s ease-in-out',
          fontFamily: 'DM Sans',
          fontWeight: 600,
          fontSize: 20,
        }}>
          Welcome to our site, if you need help simply reply to this message, we are online and ready to help.
        </div >
      )}

      {/* Chat Icon Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowWelcomePopup(false);
        }}
        className="chat-icon-button"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: themeColor,
          border: '1px solid #ccc',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          zIndex: 1000,
        }}
      >
        <img src={aiSparkChatbotAlt} alt="logo" width={30} />
      </button>

      {/* Chat Modal */}
      {
        isOpen && (
          <div style={{
            position: 'fixed',
            bottom: 90,
            right: 20,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '20px',
            boxShadow: '0 5px 20px rgba(0,0,0,0.15)',
            width: '350px',
            height: '500px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1001
          }}>
            <div className="chat-container">
              {/* Header */}
              <header className="chat-header" style={{
                background: themeColor,
                borderBottom: '1px solid #ccc',
              }}>
                <div className="header-left">
                  <div className="logo">
                    <img src={logo ? "https://wellnexai.com/uploads/business-logos/" + logo : '/chatbot.logo.png'} alt="logo" width={40} />
                  </div>
                  <div>
                    <h1 className="title" style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#fff',
                      wordWrap: 'break-word',
                      whiteSpace: 'normal',
                      maxWidth: '200px'
                    }}>{name ? name : "Wellnex AI"}</h1>
                    <div className="status">
                      <div className="status-dot"></div>
                      <span className="status-text">Online</span>
                    </div>
                  </div>
                </div>
                <button
                  className="minimize-button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '5px'
                  }}
                >
                  <span className="minus-icon">
                    <img src={minusIcon} alt="logo" width={20} />
                  </span>
                </button>
              </header>

              {/* Chat Area or Form */}
              {isChatComplete && formFields.length > 0 ? (
                <div className="form-container" style={{ padding: '20px', overflowY: 'auto' }}>
                  <form onSubmit={handleFormSubmit}>
                    {formFields.map((field) => (
                      <div key={field.name} style={{ marginBottom: '15px' }}>
                        {field.type === 'checkbox' ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              name={field.name}
                              checked={formData[field.name] as boolean || false}
                              onChange={handleFormChange}
                              required={field.required}
                            />
                            <span>{field.label}</span>
                          </label>
                        ) : (
                          <>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>
                              {field.label}
                            </label>
                            <input
                              type={field.type}
                              name={field.name}
                              value={formData[field.name] as string || ''}
                              onChange={handleFormChange}
                              required={field.required}
                              placeholder={field.placeholder}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc'
                              }}
                            />
                          </>
                        )}
                      </div>
                    ))}
                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: themeColor,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Submit
                    </button>
                  </form>
                  <div style={{ color: "red", textAlign: "center", paddingTop: "5px" }}>{formError}</div>
                </div>
              ) : (
                <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
                  {messages.map((message, index) => (
                    <div key={index} className={`message-container ${message.isUser ? "user-message" : "bot-message"}`}>
                      <div className={`message-bubble ${message.isUser ? "user-bubble" : "bot-bubble"}`} style={{
                        background: !message.isUser ? themeColor : '#f0f0f0',
                        color: !message.isUser ? '#fff' : '#000',
                        position: 'relative',
                        [message.isUser ? 'right' : 'left']: '13px'
                      }}>
                        <p style={{ margin: 0 }}>{message.text}</p>
                        {message.nextSteps && (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginTop: '12px'
                          }}>
                            {message.nextSteps.map((step, index) => (
                              <button
                                key={index}
                                onClick={() => handleNextStep(step)}
                                className="next-step-button"
                                style={{
                                  color: themeColor,
                                  border: `1px solid ${themeColor}`,
                                }}
                              >
                                {step}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className={`message-triangle ${message.isUser ? "user-triangle" : "bot-triangle"}`}
                          style={{
                            position: 'absolute',
                            bottom: '-10px',
                            [message.isUser ? 'right' : 'left']: '0',
                            width: '0',
                            height: '0',
                            borderLeft: message.isUser ? '10px solid transparent' : '10px solid' + themeColor,
                            borderRight: message.isUser ? '10px solid #f0f0f0' : '10px solid ' + 'transparent',
                            borderTop: message.isUser ? '10px solid #f0f0f0' : '10px solid ' + themeColor,
                            borderBottom: '10px solid transparent',
                            zIndex: 1,
                          }}
                        />
                      </div>
                      {message.isUser ? (
                        <div className="user-avatar" style={{
                          background: themeColor,
                        }}>
                          <UserIcon color='white' />
                        </div>
                      ) : <div className="bot-avatar" style={{
                        background: themeColor,
                      }}>
                        <img src={logo ? "https://wellnexai.com/uploads/business-logos/" + logo : '/chatbot.logo.png'} alt="bot-avatar" />
                      </div>}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="message-container bot-message">
                      <div className="message-bubble bot-bubble" style={{
                        background: themeColor,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        position: 'relative',
                        'left': '13px'
                      }}>
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>

                        <div className={`message-triangle bot-triangle`}
                          style={{
                            position: 'absolute',
                            bottom: '-10px',
                            'left': '0',
                            width: '0',
                            height: '0',
                            borderLeft: '10px solid' + themeColor,
                            borderRight: '10px solid ' + 'transparent',
                            borderTop: '10px solid ' + themeColor,
                            borderBottom: '10px solid transparent',
                            zIndex: 1,
                          }}
                        />
                      </div>
                      <div className="bot-avatar" style={{
                        background: themeColor,
                      }}>
                        <img src={logo ? "https://wellnexai.com/uploads/business-logos/" + logo : '/chatbot.logo.png'} alt="bot-avatar" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Input Area - Only show if chat is not complete */}
              {!isChatComplete && !messages.find(f => f.nextSteps) && (
                <div className="input-area">
                  <div className="input-container">
                    <input
                      type="text"
                      placeholder="Type your message here..."
                      className="message-input"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      className="send-button"
                      disabled={isLoading}
                    >
                      <img src={sendIcon} alt="send" width={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(10px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
          }

          .typing-indicator {
            display: flex;
            gap: 4px;
          }

          .typing-indicator span {
            width: 8px;
            height: 8px;
            background: rgba(255, 255, 255, 0.7);
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out;
          }

          .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
          .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }

          .next-step-button {
            padding: 8px 16px;
            background: #fff;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
          }
        `}
      </style>
    </>
  );
};

export default Chatbot;

