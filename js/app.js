// TODO: AI train responses, migrate from json responses
let chatData = {};

// Enhanced expressions with more natural variations
const expressions = {
  idle: {
    default: '😊',
    lookLeft: '🙄',
    lookRight: '😏',
    blink: '😌',
    variations: ['🙂', '😊', '🤗']
  },
  happy: {
    default: '😄',
    excited: '🤩',
    pleased: '😊',
    variations: ['😄', '😃', '🤗']
  },
  thinking: {
    default: '🤔',
    deep: '🧐',
    processing: '💭',
    variations: ['🤔', '🧐', '💭']
  },
  confused: {
    default: '😕',
    unsure: '🤨',
    dontKnow: '🤷',
    variations: ['😕', '🤨', '❓']
  }
};

const botState = {
  currentEmotion: 'idle',
  currentExpression: expressions.idle.default,
  isProcessing: false,
  lastInteractionTime: Date.now(),
  idleAnimationFrame: null,
  blinkTimeout: null,
  lookTimeout: null
};

// Function to get random expression from a category
function getRandomExpression(category, subCategory) {
  const expressionSet = expressions[category][subCategory];
  return expressionSet[Math.floor(Math.random() * expressionSet.length)];
}

// Function to update the bot's ASCII face with more variants
function updateBotFace(emotion, context = '') {
  const botFaceElement = document.getElementById('bot-face');
  if (!botFaceElement) return;

  // Avoid interrupting a locked state
  if (botState.currentEmotion === 'confused' && emotion !== 'idle') {
    return; // Prevent any updates until confused state is fully done
  }

  botState.currentEmotion = emotion;
  botState.lastInteractionTime = Date.now();

  switch (emotion) {
    case 'idle':
      botState.currentExpression = expressions.idle.default;
      break;
    case 'thinking':
      botState.isProcessing = true;
      botState.currentExpression = expressions.thinking.default;
      let thinkingIndex = 0;
      const thinkingInterval = setInterval(() => {
        if (!botState.isProcessing) {
          clearInterval(thinkingInterval);
          return;
        }
        botFaceElement.textContent = expressions.thinking.variations[thinkingIndex];
        thinkingIndex = (thinkingIndex + 1) % expressions.thinking.variations.length;
      }, 1000);
      break;
    case 'happy':
      botState.currentExpression = expressions.happy.default;
      botFaceElement.textContent = expressions.happy.excited;
      setTimeout(() => {
        if (botState.currentEmotion === 'happy') {
          botFaceElement.textContent = expressions.happy.default;
        }
      }, 1000);
      break;
    case 'confused':
      botState.currentExpression = expressions.confused.default;
      let confusedIndex = 0;
      const confusedInterval = setInterval(() => {
        botFaceElement.textContent = expressions.confused.variations[confusedIndex];
        confusedIndex = (confusedIndex + 1) % expressions.confused.variations.length;
      }, 1000);
      // Stay confused for at least 3 seconds
      setTimeout(() => {
        clearInterval(confusedInterval);
        if (botState.currentEmotion === 'confused') {
          updateBotFace('idle'); // Go to idle after confused state is over
        }
      }, 3000);
      break;
    default:
      botState.currentExpression = expressions.idle.default;
  }

  botFaceElement.textContent = botState.currentExpression;
}



function startIdleAnimations() {
  if (botState.idleAnimationFrame) {
    cancelAnimationFrame(botState.idleAnimationFrame);
  }
  clearTimeout(botState.blinkTimeout);
  clearTimeout(botState.lookTimeout);

  function idleLoop() {
    const now = Date.now();
    const timeSinceLastInteraction = now - botState.lastInteractionTime;

    // Only show idle animations if we're not processing and it's been more than 3 seconds
    if (!botState.isProcessing && timeSinceLastInteraction > 3000) {
      // Random chance to become happy during idle (5% chance)
      if (Math.random() < 0.05) {
        updateBotFace('happy');
        setTimeout(() => updateBotFace('idle'), 2000);
      }

      // Manage blinking
      if (!botState.blinkTimeout) {
        scheduleBlink();
      }

      // Manage looking around
      if (!botState.lookTimeout) {
        scheduleLookAround();
      }
    }

    botState.idleAnimationFrame = requestAnimationFrame(idleLoop);
  }

  idleLoop();
}

function scheduleBlink() {
  const minBlinkDelay = 2000; // Minimum 2 seconds between blinks
  const maxBlinkDelay = 6000; // Maximum 6 seconds between blinks
  const blinkDuration = 200; // How long the blink lasts

  const nextBlinkDelay = Math.random() * (maxBlinkDelay - minBlinkDelay) + minBlinkDelay;

  botState.blinkTimeout = setTimeout(() => {
    if (botState.currentEmotion === 'idle') {
      const botFaceElement = document.getElementById('bot-face');
      if (botFaceElement) {
        botFaceElement.textContent = expressions.idle.blink;
        
        // Return to default expression after blink
        setTimeout(() => {
          if (botState.currentEmotion === 'idle') {
            botFaceElement.textContent = botState.currentExpression;
          }
        }, blinkDuration);
      }
    }
    clearTimeout(botState.blinkTimeout);
    botState.blinkTimeout = null;
    scheduleBlink();
  }, nextBlinkDelay);
}

function scheduleLookAround() {
  const minLookDelay = 4000; // Minimum 4 seconds between looking around
  const maxLookDelay = 8000; // Maximum 8 seconds between looking around
  const lookDuration = 1000; // How long to hold the look

  const nextLookDelay = Math.random() * (maxLookDelay - minLookDelay) + minLookDelay;

  botState.lookTimeout = setTimeout(() => {
    if (botState.currentEmotion === 'idle') {
      const botFaceElement = document.getElementById('bot-face');
      if (botFaceElement) {
        // Randomly look left or right
        const lookDirection = Math.random() < 0.5 ? 'lookLeft' : 'lookRight';
        botFaceElement.textContent = expressions.idle[lookDirection];
        
        // Return to default expression after looking
        setTimeout(() => {
          if (botState.currentEmotion === 'idle') {
            botFaceElement.textContent = botState.currentExpression;
          }
        }, lookDuration);
      }
    }
    clearTimeout(botState.lookTimeout);
    botState.lookTimeout = null;
    scheduleLookAround();
  }, nextLookDelay);
}

// Function to load JSON responses from an external file
async function loadChatData() {
  try {
    const response = await fetch('responses.json');
    chatData = await response.json();
    updateBotFace('happy'); // Bot is happy once data is loaded
  } catch (error) {
    updateBotFace('sad'); // Bot is sad if there's a load error
    console.error('Failed to load chat data:', error);
  }
}

// Enhanced matching function with keyword recognition
function findClosestMatch(input) {
  const normalizedInput = input.toLowerCase().trim();

  if (chatData[normalizedInput]) {
    return normalizedInput;
  }

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

  const inputWords = normalizedInput
    .replace(/[?.,!]/g, '')
    .split(' ')
    .filter(word => !['what', 'is', 'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of'].includes(word));

  let bestMatch = null;
  let bestScore = 0;

  for (const key of Object.keys(chatData)) {
    const keyWords = key
      .toLowerCase()
      .replace(/[?.,!]/g, '')
      .split(' ')
      .filter(word => !['what', 'is', 'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of'].includes(word));

    const matchingWords = inputWords.filter(word => keyWords.includes(word));
    const score = matchingWords.length;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = key;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

// Enhanced topic suggestion with categorization
function suggestTopics() {
  updateBotFace('confused'); // Bot shows confused face
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

    const language = response.code.split('\n')[0].replace('```', '').trim();
    const codeText = response.code.replace(/```.*?\n/, '').replace('```', '').trim();

    codeContent.className = `language-${language}`;
    codeContent.textContent = codeText;

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
  updateBotFace('typing'); // Bot is typing
  const chatBody = document.getElementById('chatBody');
  const typingIndicator = document.createElement('div');
  typingIndicator.classList.add('message', 'bot', 'typing-indicator');

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
function handleBotResponse(botResponse, processedInput = null) {
  botState.isProcessing = true;
  updateBotFace('thinking'); // Initially show thinking face
  const typingIndicator = showTypingIndicator();

  const responseLength = (botResponse.answer?.length || 0) + (botResponse.code?.length || 0);
  const baseDelay = 1000;
  const charDelay = 5;
  const maxDelay = 3000;
  const delay = Math.min(baseDelay + responseLength * charDelay, maxDelay);

  setTimeout(() => {
    removeTypingIndicator(typingIndicator);
    botState.isProcessing = false;

    // If the bot is confused (no valid response found), update face to confused for 3 seconds
    if (!botResponse.answer) {
      updateBotFace('confused');
      
      // Lock in the confused state for 3 seconds before returning to idle
      setTimeout(() => {
        if (botState.currentEmotion === 'confused') { // Ensure the bot is still confused
          updateBotFace('idle');
        }
      }, 3000);  // Stay in the confused state for at least 3 seconds

    } else {
      updateBotFace('happy');
      // Return to idle after showing happiness
      setTimeout(() => {
        if (botState.currentEmotion === 'happy') {  // Only return to idle if still happy
          updateBotFace('idle');
        }
      }, 2000);
    }

    addMessage('bot', botResponse);
  }, delay);
}


function processUserInput(input) {
  const normalizedInput = input.toLowerCase().trim();
  
  // Extract key concepts and intentions
  const patterns = {
    question: /^(what|how|why|when|can|could|would|is|are|does)/i,
    greeting: /(hi|hello|hey|greetings)/i,
    gratitude: /(thanks|thank you|appreciate)/i,
    farewell: /(bye|goodbye|see you|cya)/i,
    help: /(help|assist|support|guide)/i,
    example: /(example|show|demonstrate)/i
  };

  const inputType = Object.entries(patterns).find(([_, pattern]) => 
    pattern.test(normalizedInput)
  )?.[0] || 'statement';

  // Process based on input type
  let processedInput = {
    type: inputType,
    originalText: input,
    keywords: extractKeywords(normalizedInput),
    sentiment: analyzeSentiment(normalizedInput)
  };

  return processedInput;
}

function analyzeSentiment(text) {
  const sentiments = {
    positive: ['thank', 'great', 'awesome', 'good', 'excellent', 'love', 'perfect', 'yes', 'help'],
    negative: ['error', 'wrong', 'bad', 'not', 'issue', 'problem', 'bug', 'fail', 'no'],
    confused: ['why', 'how', 'what if', 'unclear', 'confused', 'don\'t understand'],
    technical: ['code', 'function', 'method', 'class', 'variable', 'loop', 'array']
  };

  text = text.toLowerCase();
  let scores = {
    positive: 0,
    negative: 0,
    confused: 0,
    technical: 0
  };

  // Calculate sentiment scores
  Object.entries(sentiments).forEach(([sentiment, words]) => {
    words.forEach(word => {
      if (text.includes(word)) {
        scores[sentiment]++;
      }
    });
  });

  return scores;
}

// Modified handleUserInput to ensure consistent processing
function handleUserInput() {
  const userInput = document.getElementById('userInput').value.trim();

  if (userInput) {
    const processedInput = processUserInput(userInput);
    addMessage('user', { answer: userInput });
    updateBotFace('processing', userInput);

    let botResponse;
    if (processedInput.type === 'greeting') {
      botResponse = {
        answer: "Hello! How can I help you learn Java today?",
        code: null
      };
    } else {
      const closestMatch = findClosestMatch(userInput);
      botResponse = closestMatch ? chatData[closestMatch] : suggestTopics();
    }

    handleBotResponse(botResponse, processedInput);
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

// Function to show a greeting message with topic suggestions
function showGreetingWithSuggestions() {
  const greetingMessage = {
    answer: "Hello! I'm here to help you learn Java. What would you like to know about?",
    code: null
  };

  // Display greeting message
  addMessage('bot', greetingMessage);

  // Display suggestion buttons for common topics
  const suggestedTopics = [
    { 
      key: 'what is a method?', 
      label: 'Methods', 
      question: 'What is a method?'
    },
    { 
      key: 'what is a variable?', 
      label: 'Variables', 
      question: 'What is a variable?'
    },
    { 
      key: 'what is a class?', 
      label: 'Classes', 
      question: 'What is a class?'
    },
    { 
      key: 'what is object oriented programming?', 
      label: 'OOP', 
      question: 'What is object oriented programming?'
    }
  ];

  addSuggestionButtons(suggestedTopics);
}

function extractKeywords(text) {
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to']);
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(word => !stopWords.has(word));
}

// Function to display suggestion buttons below the bot's greeting
function addSuggestionButtons(topics) {
  const chatBody = document.getElementById('chatBody');
  const buttonContainer = document.createElement('div');
  buttonContainer.classList.add('button-container');
  buttonContainer.id = 'suggestion-buttons';

  topics.forEach(topic => {
    const button = document.createElement('button');
    button.classList.add('suggestion-button');
    button.textContent = topic.label;
    button.onclick = () => handleSuggestedTopicClick(topic.question);

    buttonContainer.appendChild(button);
  });

  chatBody.appendChild(buttonContainer);
  scrollToBottom();
}

// Handle the user clicking a suggestion button
function handleSuggestedTopicClick(question) {
  removeSuggestionButtons();
  addMessage('user', { answer: question });

  // Process the suggested topic click as user input
  const processedInput = processUserInput(question);
  
  const response = chatData[question.toLowerCase()];
  let botResponse = response ? response : suggestTopics();

  handleBotResponse(botResponse, processedInput);
}

// Remove the suggestion buttons from the chat when user interacts
function removeSuggestionButtons() {
  const buttonContainer = document.getElementById('suggestion-buttons');
  if (buttonContainer) {
    buttonContainer.remove();
  }
}

// Clean up intervals when needed
function cleanupBotAnimations() {
  if (botState.idleAnimationFrame) {
    cancelAnimationFrame(botState.idleAnimationFrame);
  }
  clearTimeout(botState.blinkTimeout);
  clearTimeout(botState.lookTimeout);
}

window.onload = () => {
  loadChatData();
  updatePlaceholder();
  showGreetingWithSuggestions();
  startIdleAnimations();
  updateBotFace('happy'); // Initial greeting expression
};

// Optional: Add cleanup on page unload
window.addEventListener('unload', cleanupBotAnimations);