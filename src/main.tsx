import ReactDOM from 'react-dom/client';
import Chatbot from './Chatbot';
import './index.css';

function initializeChatbot() {
  // Check if container already exists
  let container = document.getElementById('wellnex-chatbot-container');
  if (!container) {
    container = document.createElement('div');
container.id = 'wellnex-chatbot-container';
document.body.appendChild(container);
  }

const root = ReactDOM.createRoot(container);
root.render(<Chatbot />);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeChatbot);
} else {
  initializeChatbot();
}

(function () {
  const currentScript = document.currentScript;
  const businessId = currentScript?.getAttribute("data-business-id");
  console.log("Business ID:", businessId);
  if (businessId) {
    sessionStorage.setItem('wellnex_business_id', businessId);
  }
})();
