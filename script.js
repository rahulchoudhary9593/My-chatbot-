// =========================================================================
// !!! WARNING: INSECURE METHOD FOR TESTING ONLY !!!
// Your Gemini API Key is exposed in this client-side code.
// FOR SECURE DEPLOYMENT, use a Netlify Function or a dedicated backend.
// =========================================================================

// 1. अपनी असली Gemini API Key यहाँ डालें। (Replace with your actual key!)
const GEMINI_API_KEY = "AIzaSyAKKqSr6hzYL0L0a2qIlyVlnTRgkYVenDs";

// 2. Google Gemini API Endpoint
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// 3. CORS Proxy URL (CORS error से बचने के लिए, आप इसे बदल सकते हैं)
// NOTE: Public proxies can be slow or unreliable. For a real app, use a backend.
const PROXY_URL = "https://corsproxy.io/?"; 
// इस प्रॉक्सी को उपयोग करने के लिए, हम GEMINI_API_URL को encode करके भेजेंगे।

// Global System Instruction: Bot का व्यक्तित्व सेट करें
const SYSTEM_INSTRUCTION = "You are a helpful, friendly, and concise chatbot assistant. Keep your answers brief unless the user asks for detail.";

// DOM elements
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Array to store the conversation history (Only User and Model roles)
let chatHistory = [
    // Initial bot message is already in HTML, but added here to maintain context consistency
    {
        role: "model",
        parts: [{ text: "Hello! I'm your Gemini-powered assistant. How can I help you today?" }]
    }
];

// Function to enable/disable the send button
userInput.addEventListener('input', () => {
    sendBtn.disabled = userInput.value.trim() === '' || sendBtn.classList.contains('processing');
});

// Function to create a new chat message element
const createChatLi = (message, className) => {
    const chatLi = document.createElement('li');
    chatLi.classList.add('chat', className);
    
    let content = className === 'outgoing' 
        ? `<p>${message}</p>` 
        : `<span class="material-symbols-rounded">robot</span><p>${message}</p>`;

    chatLi.innerHTML = content;
    return chatLi;
};

// =========================================================================
// CORE LOGIC: ASYNCHRONOUS CALL TO GEMINI API VIA PROXY
// =========================================================================
const handleChat = async () => {
    const userMessage = userInput.value.trim();
    if (!userMessage || GEMINI_API_KEY === "AIzaSyAKKqSr6hzYL0L0a2qIlyVlnTRgkYVenDs") {
        if (GEMINI_API_KEY === "YOUR_FREE_GEMINI_API_KEY_HERE") {
            alert("ERROR: Please replace 'YOUR_FREE_GEMINI_API_KEY_HERE' with your actual key in script.js!");
        }
        return;
    }

    // 1. Clear input, disable button, and set 'processing' state
    userInput.value = '';
    sendBtn.disabled = true;
    sendBtn.classList.add('processing'); 

    // 2. Add user message to the chat window and history
    chatWindow.appendChild(createChatLi(userMessage, 'outgoing'));
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // Add user message to history array for context
    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

    // 3. Display a "Thinking..." message
    const incomingChatLi = createChatLi("Thinking...", 'incoming');
    chatWindow.appendChild(incomingChatLi);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        // Prepare the final URL with the API key
        const finalApiUrl = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
        
        // Prepare the payload for the Gemini API
        const payload = {
            contents: chatHistory, 
            config: {
                temperature: 0.7,
                systemInstruction: SYSTEM_INSTRUCTION, 
            }
        };

        // 4. Direct API Call using Fetch (via CORS Proxy)
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(finalApiUrl)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Proxy service may require 'x-requested-with' header
                'x-requested-with': 'XMLHttpRequest' 
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        let botResponse;

        // 5. Process the response
        if (response.ok && data.candidates && data.candidates[0].content.parts.length > 0) {
            // Success: Extract the text response
            botResponse = data.candidates[0].content.parts[0].text;
            
            // Add the bot's response to the history array
            chatHistory.push({ role: "model", parts: [{ text: botResponse }] });

        } else if (data.error) {
            // API Error (e.g., Key Invalid, Quota Exceeded)
            botResponse = `API Error: ${data.error.message}`;
            console.error('Gemini API Error:', data.error);
            
        } else {
             // Handle cases where response is empty or unexpected
            botResponse = "I couldn't generate a response. Please check the browser console for details.";
        }

        // 6. Replace "Thinking..." with the actual response
        incomingChatLi.querySelector('p').textContent = botResponse;

    } catch (error) {
        console.error('Fetch/CORS Error:', error);
        incomingChatLi.querySelector('p').textContent = "Connection failed. CORS/Network Error. Switch to Netlify Functions!";
        // Optional: Error styling
        incomingChatLi.querySelector('p').style.backgroundColor = '#f8d7da';
        incomingChatLi.querySelector('p').style.color = '#721c24';
    }

    // 7. Final cleanup and scrolling
    sendBtn.classList.remove('processing');
    chatWindow.scrollTop = chatWindow.scrollHeight;
    sendBtn.disabled = userInput.value.trim() === '';
};

// Event Listeners
sendBtn.addEventListener('click', handleChat);
userInput.addEventListener('keypress', (e) => {
    // Check for Enter key, but NOT Shift+Enter (to allow line breaks)
    if (e.key === 'Enter' && !e.shiftKey && !sendBtn.disabled) {
        e.preventDefault();
        handleChat();
    }
});