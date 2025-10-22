// =========================================================================
// !!! WARNING: INSECURE METHOD FOR TESTING ONLY !!!
// The Gemini API Key is exposed in this client-side code.
// FOR SECURE DEPLOYMENT, you MUST use a Netlify Function or a secure backend.
// =========================================================================

// 1. Replace "YOUR_FREE_GEMINI_API_KEY_HERE" with your actual key!
const GEMINI_API_KEY = "AIzaSyAKKqSr6hzYL0L0a2qIlyVlnTRgkYVenDs";

// 2. Gemini API Endpoint URL
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// 3. CORS Proxy URL (Used to bypass the browser's security rules)
// WARNING: Public proxies are often unreliable and may be slow.
const PROXY_URL = "https://corsproxy.io/?"; 
const FINAL_API_ENDPOINT = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;


// Global System Instruction: Defines the chatbot's personality and behavior
const SYSTEM_INSTRUCTION = "You are a helpful and friendly chatbot assistant. Keep your answers concise and clear.";

// DOM elements
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Array to store the conversation history (Only User and Model roles are needed)
let chatHistory = [
    // Initial bot message added here to maintain context consistency
    {
        role: "model",
        parts: [{ text: "Hello! I'm your Gemini-powered assistant. How can I help you today?" }]
    }
];

// Function to enable/disable the send button based on input content
userInput.addEventListener('input', () => {
    // Disable if input is empty OR if a message is currently being processed
    sendBtn.disabled = userInput.value.trim() === '' || sendBtn.classList.contains('processing');
});

// Function to create a new chat message element (list item)
const createChatLi = (message, className) => {
    const chatLi = document.createElement('li');
    chatLi.classList.add('chat', className);
    
    // Structure the message content based on whether it's incoming (bot) or outgoing (user)
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
    
    // Check for empty input or if the key is still the placeholder
    if (!userMessage || GEMINI_API_KEY === "YOUR_FREE_GEMINI_API_KEY_HERE") {
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
    
    // Add user message to history array for multi-turn context
    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

    // 3. Display a "Thinking..." message placeholder
    const incomingChatLi = createChatLi("Thinking...", 'incoming');
    chatWindow.appendChild(incomingChatLi);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        // Prepare the payload (includes history and system instruction)
        const payload = {
            contents: chatHistory, 
            config: {
                temperature: 0.7,
                systemInstruction: SYSTEM_INSTRUCTION, 
            }
        };

        // 4. Send the Request to the CORS Proxy
        // The FINAL_API_ENDPOINT is URL-encoded before being sent to the proxy
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(FINAL_API_ENDPOINT)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-requested-with': 'XMLHttpRequest' // Header often required by proxy services
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        let botResponse;

        // 5. Process the response data
        if (response.ok && data.candidates && data.candidates[0].content.parts.length > 0) {
            // Success: Extract the text response
            botResponse = data.candidates[0].content.parts[0].text;
            
            // Add the bot's response to the history array for the next turn
            chatHistory.push({ role: "model", parts: [{ text: botResponse }] });

        } else if (data.error) {
            // API Error (e.g., Invalid Key, Quota Exceeded, Blocked by Google)
            botResponse = `API Error: ${data.error.message}. Key might be invalid or Quota exceeded.`;
            console.error('Gemini API Error:', data.error);
            
        } else {
             // Handle cases where the response is empty or unexpected
            botResponse = "I couldn't generate a response. The proxy or API might be blocking the request.";
        }

        // 6. Replace "Thinking..." placeholder with the final response
        incomingChatLi.querySelector('p').textContent = botResponse;

    } catch (error) {
        // This catch block handles pure network errors or immediate proxy failures (CORS)
        console.error('Fetch/CORS Error:', error);
        incomingChatLi.querySelector('p').textContent = "Connection failed. (Proxy or Network issue). For a guaranteed fix, use Netlify Functions.";
        // Error styling
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
    // Check for Enter key, but prevent default Shift+Enter action (new line)
    if (e.key === 'Enter' && !e.shiftKey && !sendBtn.disabled) {
        e.preventDefault();
        handleChat();
    }
});