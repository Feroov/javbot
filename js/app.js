let chatData = {};

// Function to load JSON responses from an external file
async function loadChatData() {
  try {
    const response = await fetch('responses.json');
    chatData = await response.json();
  } catch (error) {
    console.error('Failed to load chat data:', error);
  }
}

// Enhance similarity checking with more sophisticated matching
function getSimilarity(str1, str2) {
  // Convert both strings to lowercase and remove extra spaces
  str1 = str1.toLowerCase().trim();
  str2 = str2.toLowerCase().trim();

  // Check for exact matches first
  if (str1 === str2) return 0;

  // Check if one string contains the other
  if (str1.includes(str2) || str2.includes(str1)) {
    return 1;
  }

  // Calculate Levenshtein distance for fuzzy matching
  const len1 = str1.length;
  const len2 = str2.length;
  const dp = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) {
    for (let j = 0; j <= len2; j++) {
      if (i === 0) dp[i][j] = j;
      else if (j === 0) dp[i][j] = i;
      else dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (str1[i - 1] === str2[j - 1] ? 0 : 1)
      );
    }
  }

  return dp[len1][len2];
}

// Enhanced matching function with keyword recognition
function findClosestMatch(input) {
  const normalizedInput = input.toLowerCase().trim();

  // Prioritize exact matches first
  if (chatData[normalizedInput]) {
    return normalizedInput;
  }

  // Handle variations like "what is a method?" and "what are methods?"
  const questionVariations = [
    normalizedInput,
    `what is ${normalizedInput}?`,
    `what is a ${normalizedInput}?`,
    `what are ${normalizedInput}?`,
    `how do i use ${normalizedInput}?`,
    `how do i ${normalizedInput}?`
  ];

  for (const variation of questionVariations) {
    if (chatData[variation]) {
      return variation;
    }
  }

  // Check for relevant keyword matches and rank them
  const keywords = normalizedInput.split(' ')
    .filter(word => word.length > 2)
    .map(word => word.replace(/[?.,!]/g, ''));

  let bestMatch = null;
  let highestScore = -1;

  for (const key in chatData) {
    const keyWords = key.toLowerCase().split(' ');

    // Count the number of matching keywords
    const matchScore = keywords.reduce((score, word) => {
      return score + (keyWords.includes(word) ? 1 : 0);
    }, 0);

    if (matchScore > highestScore) {
      highestScore = matchScore;
      bestMatch = key;
    }
  }

  // If a decent match is found, return it; otherwise, return null
  return highestScore > 0 ? bestMatch : null;
}

// Enhanced topic suggestion with categorization
function suggestTopics() {
  // Define topics with their corresponding keys in chatData
  const categories = {
    basics: [
      { key: 'what is a variable?', label: 'variables' },
      { key: 'how do I print in java?', label: 'printing' },
      { key: 'what is a method?', label: 'methods' }
    ],
    intermediate: [
      { key: 'what is a class?', label: 'classes' },
      { key: 'what is an object?', label: 'objects' },
      { key: 'what is a loop?', label: 'loops' }
    ],
    advanced: [
      { key: 'what is an if statement?', label: 'control flow' }
    ]
  };

  const suggestions = {};

  // Select one topic from each category that exists in chatData
  for (const category in categories) {
    const availableTopics = categories[category].filter(topic =>
      chatData[topic.key]
    );

    if (availableTopics.length > 0) {
      const randomTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
      suggestions[category] = randomTopic.label;
    }
  }

  return {
    answer: `I'm not sure about that. Would you like to learn about:\n` +
      `• Basic concept: ${suggestions.basics || 'basic Java concepts'}\n` +
      `• Intermediate concept: ${suggestions.intermediate || 'intermediate Java topics'}\n` +
      `• Advanced concept: ${suggestions.advanced || 'advanced Java features'}\n` +
      `\nOr you can ask me about any Java topic!`,
    code: null
  };
}


// Enhanced message formatting
function formatMessage(text) {
  text = text.replace(/^\d\.\s+/gm, '<br>• ');
  text = text.replace(/\n/g, '<br>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  return text;
}

// Enhanced message display with support for formatted text
function addMessage(sender, response) {
  const chatBody = document.getElementById('chatBody');

  if (response.answer) {
    const answerMessage = document.createElement('div');
    answerMessage.classList.add('message', sender);
    answerMessage.innerHTML = formatMessage(response.answer);
    chatBody.appendChild(answerMessage);
  }

  if (response.code) {
    const codeMessage = document.createElement('div');
    codeMessage.classList.add('message', sender, 'code-block');

    const codeBlock = document.createElement('pre');
    const codeContent = document.createElement('code');

    // Extract language and code
    const language = response.code.split('\n')[0].replace('```', '').trim();
    const codeText = response.code
      .replace(/```.*?\n/, '')
      .replace('```', '')
      .trim();

    codeContent.className = `language-${language}`;
    codeContent.textContent = codeText;

    // Add copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.innerHTML = '📋 Copy';
    copyButton.onclick = () => {
      navigator.clipboard.writeText(codeText);
      copyButton.innerHTML = '✓ Copied!';
      setTimeout(() => {
        copyButton.innerHTML = '📋 Copy';
      }, 2000);
    };

    codeBlock.appendChild(copyButton);
    codeBlock.appendChild(codeContent);
    codeMessage.appendChild(codeBlock);
    chatBody.appendChild(codeMessage);
  }

  scrollToBottom();
  Prism.highlightAll();
}

// Enhanced typing animation
function showTypingIndicator() {
  const chatBody = document.getElementById('chatBody');
  const typingIndicator = document.createElement('div');
  typingIndicator.classList.add('message', 'bot', 'typing-indicator');

  // Create an animated typing indicator
  const dot1 = document.createElement('span');
  const dot2 = document.createElement('span');
  const dot3 = document.createElement('span');

  [dot1, dot2, dot3].forEach(dot => {
    dot.textContent = '•';
    typingIndicator.appendChild(dot);
  });

  chatBody.appendChild(typingIndicator);
  scrollToBottom();
  return typingIndicator;
}

// Enhanced bot response handling with variable delay
function handleBotResponse(botResponse) {
  const typingIndicator = showTypingIndicator();

  // Calculate delay based on response length
  const responseLength = (botResponse.answer?.length || 0) +
    (botResponse.code?.length || 0);
  const baseDelay = 1000;
  const charDelay = 5;
  const maxDelay = 3000;
  const delay = Math.min(baseDelay + responseLength * charDelay, maxDelay);

  setTimeout(() => {
    removeTypingIndicator(typingIndicator);
    addMessage('bot', botResponse);
  }, delay);
}

// Enhanced user input handling
function handleUserInput() {
  const userInput = document.getElementById('userInput').value.trim();

  if (userInput) {
    // Add user message
    addMessage('user', { answer: userInput });

    // Find closest match with enhanced matching
    const closestMatch = findClosestMatch(userInput);
    let botResponse = closestMatch ? chatData[closestMatch] : suggestTopics();

    handleBotResponse(botResponse);
    document.getElementById('userInput').value = '';
  }
}

// Event listeners
document.getElementById('sendBtn').addEventListener('click', handleUserInput);
document.getElementById('userInput').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    handleUserInput();
  }
});

// Add input placeholder with rotating suggestions
function updatePlaceholder() {
  const placeholders = [
    "Ask me about Java methods...",
    "Learn about classes...",
    "How do I create objects?",
    "What are variables?",
    "Tell me about loops..."
  ];
  const input = document.getElementById('userInput');
  let currentIndex = 0;

  setInterval(() => {
    input.placeholder = placeholders[currentIndex];
    currentIndex = (currentIndex + 1) % placeholders.length;
  }, 2400);
}

// Helper function: Scroll chat to bottom
function scrollToBottom() {
  const chatBody = document.getElementById('chatBody');
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Helper function: Remove typing indicator
function removeTypingIndicator(typingIndicator) {
  if (typingIndicator && typingIndicator.parentNode) {
    typingIndicator.remove();
  }
}

// Initialize
window.onload = () => {
  loadChatData();
  updatePlaceholder();
};