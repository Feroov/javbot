let chatData = {};


const inputProcessor = {
  // Common question patterns and their variations
  patterns: {
    definition: {
      keywords: ['what', 'is', 'mean', 'define', 'explain', 'tell'],
      variations: ['what is', 'what does', 'can you explain', 'tell me about', 'define']
    },
    howTo: {
      keywords: ['how', 'do', 'can', 'way', 'implement', 'create', 'write'],
      variations: ['how do i', 'how can i', 'how to', 'show me how', 'ways to']
    },
    comparison: {
      keywords: ['difference', 'between', 'compare', 'vs', 'versus', 'better'],
      variations: ['what is the difference', 'how does', 'compare', 'which is better']
    },
    example: {
      keywords: ['example', 'sample', 'show', 'demonstrate', 'code'],
      variations: ['give me an example', 'show me', 'can you demonstrate', 'sample code']
    }
  },

  // Core Java concepts for topic matching
  concepts: {
    basics: ['variable', 'method', 'class', 'object', 'function', 'type', 'data', 'print'],
    oop: ['inheritance', 'polymorphism', 'encapsulation', 'abstraction', 'interface', 'method overloading', 'method overriding'],

    control: ['loop', 'if', 'else', 'switch', 'condition', 'while', 'for'],
    dataStructures: ['array', 'list', 'map', 'set', 'collection', 'vector'],
    exceptions: ['exception', 'error', 'try', 'catch', 'finally', 'throw'],
    modifiers: ['public', 'private', 'protected', 'static', 'final']
  },

  // Process user input to extract intent and context
  processInput(input) {
    const normalizedInput = input.toLowerCase().trim();

    return {
      type: this.determineQueryType(normalizedInput),
      concepts: this.extractConcepts(normalizedInput),
      context: this.determineContext(normalizedInput),
      confidence: this.calculateConfidence(normalizedInput)
    };
  },

  // Determine the type of query
  // Updated determineQueryType function
  determineQueryType(input) {
    const inputLower = input.toLowerCase();

    // Prioritize common phrases with specific weights
    if (inputLower.startsWith("what is") || inputLower.startsWith("what's")) {
      return 'definition';
    }
    if (inputLower.startsWith("how to") || inputLower.startsWith("how do")) {
      return 'howTo';
    }

    let maxScore = 0;
    let queryType = 'unknown';

    for (const [type, pattern] of Object.entries(this.patterns)) {
      let score = 0;

      for (const variation of pattern.variations) {
        if (input.includes(variation)) score += 2;
      }

      for (const keyword of pattern.keywords) {
        if (input.includes(keyword)) score += 1;
      }

      if (score > maxScore) {
        maxScore = score;
        queryType = type;
      }
    }

    return queryType;
  },


  // Extract relevant Java concepts from the input
  extractConcepts(input) {
    const foundConcepts = [];
    const normalizedInput = input.toLowerCase();

    for (const [category, conceptList] of Object.entries(this.concepts)) {
      conceptList.forEach(concept => {
        if (normalizedInput.includes(concept)) {
          foundConcepts.push({
            category,
            concept,
            context: this.getConceptContext(normalizedInput, concept)
          });
        }
      });
    }

    return foundConcepts;
  }
  ,

  // Get surrounding context for a matched concept
  getConceptContext(input, concept) {
    const words = input.split(' ');
    const conceptIndex = words.findIndex(word => word.includes(concept));

    if (conceptIndex === -1) return '';

    // Get 3 words before and after the concept for context
    const start = Math.max(0, conceptIndex - 3);
    const end = Math.min(words.length, conceptIndex + 4);

    return words.slice(start, end).join(' ');
  },

  // Determine the broader context of the question
  determineContext(input) {
    const contexts = {
      learning: ['learn', 'understand', 'explain', 'help', 'new to', 'beginner'],
      implementation: ['implement', 'create', 'build', 'write', 'code'],
      troubleshooting: ['error', 'problem', 'issue', 'bug', 'wrong', 'fix'],
      bestPractice: ['best', 'practice', 'proper', 'right way', 'should']
    };

    const matchedContexts = [];

    for (const [context, keywords] of Object.entries(contexts)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        matchedContexts.push(context);
      }
    }

    return matchedContexts.length > 0 ? matchedContexts : ['general'];
  },

  // Calculate confidence score for the match
  calculateConfidence(input) {
    let confidence = 0;

    // Check for clear question structure
    if (this.hasQuestionStructure(input)) confidence += 0.3;

    // Check for Java-specific terms
    if (this.hasJavaTerms(input)) confidence += 0.3;

    // Check for context clarity
    if (this.hasCleanContext(input)) confidence += 0.4;

    return Math.min(confidence, 1);
  },

  // Helper methods for confidence calculation
  hasQuestionStructure(input) {
    const questionPatterns = [
      /^(what|how|why|when|can|could|would|where|which)/i,
      /\?$/,
      /(tell|show|explain|help).+(me|us)/i
    ];
    return questionPatterns.some(pattern => pattern.test(input));
  },

  hasJavaTerms(input) {
    const javaSpecificTerms = [
      'java', 'class', 'method', 'object', 'interface',
      'public', 'private', 'static', 'void', 'string'
    ];
    return javaSpecificTerms.some(term => input.toLowerCase().includes(term));
  },

  hasCleanContext(input) {
    // Check if the input is relatively clean and focused
    return input.length > 10 && input.length < 200 &&
      !input.includes('http') && // No URLs
      !/[<>{}]/g.test(input);    // No code snippets
  },

  // Find the closest matching response from chatData
  findBestResponse(processedInput, chatData) {
    if (!chatData || typeof chatData !== 'object') {
      console.error('Invalid chatData provided to findBestResponse');
      return {
        match: null,
        confidence: 0,
        fallbackSuggestions: []
      };
    }

    let bestMatch = null;
    let highestScore = 0;

    for (const [key, response] of Object.entries(chatData)) {
      // Skip invalid entries
      if (!key || !response) continue;

      const score = calculateMatchScore(processedInput, key, response);

      if (score > highestScore) {
        highestScore = score;
        bestMatch = key;
      }
    }

    return {
      match: bestMatch,
      confidence: highestScore,
      fallbackSuggestions: generateFallbackSuggestions(processedInput, chatData)
    };
  },

  // Calculate match score between processed input and potential response
  calculateMatchScore(processedInput, key, response) {
    if (!response) return 0;

    let score = 0;

    // Match based on extracted concepts
    processedInput.concepts.forEach(concept => {
      if (key.toLowerCase().includes(concept.concept.toLowerCase())) {
        score += 0.4;
      }
      if (response.answer && response.answer.toLowerCase().includes(concept.concept.toLowerCase())) {
        score += 0.2;
      }
    });

    // Match based on query type
    if (processedInput.type &&
      inputProcessor.patterns[processedInput.type]?.variations.some(v =>
        key.toLowerCase().includes(v.toLowerCase()))) {
      score += 0.3;
    }

    // Context matching - only if response.answer exists
    if (response.answer) {
      processedInput.context.forEach(ctx => {
        if (response.answer.toLowerCase().includes(ctx.toLowerCase())) {
          score += 0.1;
        }
      });
    }

    return Math.min(score, 1);
  },

  // Generate relevant fallback suggestions
  generateFallbackSuggestions(processedInput, chatData) {
    if (!chatData || !processedInput.concepts) {
      return [];
    }

    const suggestions = [];
    const conceptCategories = processedInput.concepts.map(c => c.category).filter(Boolean);

    for (const [key, response] of Object.entries(chatData)) {
      // Skip invalid entries
      if (!key || !response) continue;

      if (conceptCategories.some(category =>
        inputProcessor.concepts[category]?.some(concept =>
          key.toLowerCase().includes(concept.toLowerCase()) ||
          (response.answer && response.answer.toLowerCase().includes(concept.toLowerCase()))
        ))) {
        suggestions.push(key);
      }
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }
};


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

    if (!botState.isProcessing && timeSinceLastInteraction > 3000) {
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
  const minBlinkDelay = 2000;
  const maxBlinkDelay = 6000;
  const blinkDuration = 200;

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
  const minLookDelay = 4000;
  const maxLookDelay = 8000;
  const lookDuration = 1000;

  const nextLookDelay = Math.random() * (maxLookDelay - minLookDelay) + minLookDelay;

  botState.lookTimeout = setTimeout(() => {
    if (botState.currentEmotion === 'idle') {
      const botFaceElement = document.getElementById('bot-face');
      if (botFaceElement) {
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
const fillerWords = new Set(['then', 'about', 'can', 'you', 'tell', 'me']);

// Enhanced matching function with keyword recognition
function findClosestMatch(input) {
  const normalizedInput = input.toLowerCase().trim();

  // Remove filler words from the input
  const inputWithoutFillers = normalizedInput
    .split(' ')
    .filter(word => !fillerWords.has(word))
    .join(' ');

  // First, check for an exact match on the cleaned input
  if (chatData[inputWithoutFillers]) {
    return inputWithoutFillers;
  }

  // Additional variations for better matching
  const questionVariations = [
    inputWithoutFillers,
    `what is ${inputWithoutFillers}`,
    `what is a ${inputWithoutFillers}`,
    `what are ${inputWithoutFillers}`,
    `how do i use ${inputWithoutFillers}`,
    `how do i ${inputWithoutFillers}`,
    `what can you tell me about ${inputWithoutFillers}`
  ];

  for (const variation of questionVariations) {
    if (chatData[variation]) {
      return variation;
    }
  }

  // Fallback keyword-based matching
  const inputWords = inputWithoutFillers
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

// Modified handleUserInput function to use the enhanced processor
function handleUserInput() {
  const userInput = document.getElementById('userInput')?.value?.trim();

  if (!userInput) return;

  // Log user input and processing steps
  console.log("User input:", userInput);

  // Add user message to chat
  addMessage('user', { answer: userInput });

  try {
    // Direct match attempt
    const botResponse = findBotResponse(userInput);
    console.log("Bot response selected:", botResponse);

    handleBotResponse(botResponse);
  } catch (error) {
    console.error('Error in handleUserInput:', error);
    handleBotResponse({
      answer: "I encountered an error processing your request. Please try again or ask a different question.",
      code: null
    });
  }

  // Clear input field
  const inputElement = document.getElementById('userInput');
  if (inputElement) {
    inputElement.value = '';
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

// Function to load JSON responses from an external file
async function loadChatData() {
  try {
    const response = await fetch('responses.json');
    chatData = await response.json();
    console.log('Chat data loaded:', chatData); // Log loaded chatData
    updateBotFace('happy'); // Bot is happy once data is loaded
    showGreetingWithSuggestions();
  } catch (error) {
    updateBotFace('sad'); // Bot is sad if there's a load error
    console.error('Failed to load chat data:', error);
  }
}

// Function to show a greeting message with randomized topic suggestions
function showGreetingWithSuggestions() {
  const greetingMessage = {
    answer: "Hello! I'm here to help you learn Java. What would you like to know about?",
    code: null
  };

  // Display greeting message
  addMessage('bot', greetingMessage);

  // Ensure chatData has loaded topics
  if (Object.keys(chatData).length === 0) {
    console.error('No topics available in chatData!');
    return;
  }

  // Randomly select four topics from chatData
  const availableTopics = Object.keys(chatData).map(key => ({
    key,
    label: chatData[key].label || 'Topic', // Use the label or default to 'Topic'
    question: key
  }));

  const randomizedTopics = availableTopics
    .sort(() => 0.5 - Math.random()) // Shuffle array
    .slice(0, 3);

  console.log('Randomized Topics:', randomizedTopics); // Log the selected topics

  // Display suggestion buttons for random topics
  addSuggestionButtons(randomizedTopics);
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

  if (!chatBody) {
    console.error('chatBody element not found!');
    return;
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.classList.add('button-container');
  buttonContainer.id = 'suggestion-buttons';

  topics.forEach(topic => {
    const normalizedQuestion = topic.question.toLowerCase();
    if (!chatData[normalizedQuestion]) {
      chatData[normalizedQuestion] = topic.response;
    }

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

  // Add user message to chat
  addMessage('user', { answer: question });

  // Find exact match first (case-insensitive)
  const exactMatch = Object.entries(chatData).find(([key]) =>
    key.toLowerCase() === question.toLowerCase()
  );

  if (exactMatch) {
    // Use exact match if found
    handleBotResponse(exactMatch[1]);
  } else {
    // If no exact match, fall back to the existing input processing
    const processedInput = inputProcessor.processInput(question);

    // Update bot face based on confidence
    if (processedInput.confidence < 0.3) {
      updateBotFace('confused');
    } else {
      updateBotFace('thinking');
    }

    // Find best matching response
    const { match, confidence, fallbackSuggestions } =
      inputProcessor.findBestResponse(processedInput, chatData);

    let botResponse;
    if (match && confidence > 0.4) {
      botResponse = chatData[match];
    } else {
      botResponse = {
        answer: `I'm not quite sure about that. Here are some related topics you might be interested in:\n` +
          fallbackSuggestions.map(suggestion => `• ${suggestion}`).join('\n'),
        code: null
      };
    }

    handleBotResponse(botResponse, processedInput);
  }
}

// Create a unified matching function to use across all input methods
function findBotResponse(input) {
  const normalizedInput = input.toLowerCase().trim();

  // Attempt exact match
  const exactMatch = Object.entries(chatData).find(([key]) =>
    key.toLowerCase() === normalizedInput || key.toLowerCase() === normalizedInput + "?" // handle missing question mark
  );

  if (exactMatch) {
    return exactMatch[1];
  }

  // Continue with processed input as fallback
  const processedInput = inputProcessor.processInput(normalizedInput);
  const { match, confidence, fallbackSuggestions } =
    inputProcessor.findBestResponse(processedInput, chatData);

  if (match && confidence > 0.4) {
    return chatData[match];
  }

  // Return fallback with suggestions if no confident match
  return {
    answer: `I'm not sure about that. Here are some related topics:\n` +
      fallbackSuggestions.map(suggestion => `• ${suggestion}`).join('\n'),
    code: null
  };
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

// Add a function to get random response
function getRandomResponse() {
  const responses = Object.entries(chatData);
  if (responses.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * responses.length);
  const [question, response] = responses[randomIndex];

  return {
    question,
    response
  };
}

// Modify the random button click handler to use the same matching logic
function handleRandomClick() {
  const randomContent = getRandomResponse();
  if (randomContent) {
    // Store the question in chatData if it's not already there
    if (!chatData[randomContent.question.toLowerCase()]) {
      chatData[randomContent.question.toLowerCase()] = randomContent.response;
    }

    // Show the question as if user asked it
    addMessage('user', { answer: randomContent.question });

    // Show bot's response using unified matching
    updateBotFace('thinking');
    handleBotResponse(randomContent.response);

    scrollToBottom();
  }
}

// Update the random button event listener
function addRandomButton() {
  const sendBtn = document.getElementById('sendBtn');
  if (!sendBtn) return;

  const randomBtn = document.createElement('button');
  randomBtn.id = 'randomBtn';
  randomBtn.className = 'send-button random-button';
  randomBtn.innerHTML = '🎲';

  const style = document.createElement('style');
  style.textContent = `
    .random-button {
      margin-left: 8px;
      padding: 8px 12px;
      background-color: #6c5ce7;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    
    .random-button:hover {
      background-color: #5b4bc4;
    }
    
    .random-button:active {
      transform: scale(0.98);
    }

    #chatFooter {
      display: flex;
      align-items: center;
      padding: 10px;
      gap: 8px;
    }

    #userInput {
      flex: 1;
    }
  `;

  document.head.appendChild(style);
  randomBtn.addEventListener('click', handleRandomClick);
  sendBtn.parentNode.insertBefore(randomBtn, sendBtn.nextSibling);
}

const splashTexts = [
  "System.out.println('Hello World!');",
  "public static void main(String[] args)",
  "Objects are everywhere!",
  "Java runs on billions of devices",
  "Keep calm and catch exceptions",
  "Coffee + Java = ❤️",
  "Inheritance is super()",
  "Time to implement some interfaces!",
  "Abstract classes are abstract thoughts",
  "Garbage collection in progress...",
  "Polymorphism is morphing...",
  "Loading Java beans...",
  "Encapsulation is key!",
  "Java: Write once, run anywhere",
  "Compiling happiness...",
  "Override and overload!"
];

function showSplashText() {
  const splashContainer = document.getElementById('splash-container');
  const randomText = splashTexts[Math.floor(Math.random() * splashTexts.length)];

  // Remove old bubble with exit animation
  const oldBubble = splashContainer.querySelector('.splash-bubble');
  if (oldBubble) {
    oldBubble.classList.remove('show');
    oldBubble.classList.add('hide');
    setTimeout(() => oldBubble.remove(), 500); // Remove after animation
  }

  // Create and add new bubble
  const bubble = document.createElement('div');
  bubble.className = 'splash-bubble';
  bubble.textContent = randomText;
  splashContainer.appendChild(bubble);

  // Trigger reflow to ensure animation plays
  bubble.offsetHeight;

  // Add show class to start animation
  bubble.classList.add('show');

  // Remove bubble after delay
  setTimeout(() => {
    bubble.classList.remove('show');
    bubble.classList.add('hide');
    setTimeout(() => bubble.remove(), 500);
  }, 4000);
}

function initSplashText() {
  // Show initial splash text
  showSplashText();
  // Repeat every 15 seconds
  setInterval(showSplashText, 15000);
}

window.onload = () => {
  loadChatData();
  updatePlaceholder();
  startIdleAnimations();
  updateBotFace('happy');
  addRandomButton();
  initSplashText();
};


window.addEventListener('unload', cleanupBotAnimations);