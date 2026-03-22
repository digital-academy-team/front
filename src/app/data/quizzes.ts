export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SectionQuiz {
  sectionIndex: number;
  title: string;
  questions: QuizQuestion[];
}

export type CourseQuizzes = Record<string, SectionQuiz[]>;

export const courseQuizzes: CourseQuizzes = {
  // Course 1: The Complete Web Developer Bootcamp
  '1': [
    {
      sectionIndex: 0,
      title: 'Front-End Web Development',
      questions: [
        { id: 1, question: 'Which HTML tag is used to define an internal style sheet?', options: ['<style>', '<css>', '<script>', '<head>'], correctIndex: 0, explanation: 'The <style> tag is used to embed CSS directly within an HTML document.' },
        { id: 2, question: 'Which CSS property controls the text size?', options: ['text-style', 'font-size', 'text-size', 'font-style'], correctIndex: 1, explanation: 'font-size controls the size of the text in CSS.' },
        { id: 3, question: 'What does CSS stand for?', options: ['Computer Style Sheets', 'Creative Style System', 'Cascading Style Sheets', 'Colorful Style Sheets'], correctIndex: 2, explanation: 'CSS stands for Cascading Style Sheets, used for styling HTML documents.' },
        { id: 4, question: 'Which HTML attribute specifies an alternate text for an image?', options: ['title', 'src', 'alt', 'longdesc'], correctIndex: 2, explanation: 'The alt attribute provides alternative text for an image if it cannot be displayed.' },
        { id: 5, question: 'Which property is used to change the background color in CSS?', options: ['color', 'bgcolor', 'background-color', 'background'], correctIndex: 2, explanation: 'background-color is the standard CSS property for setting background colors.' },
      ],
    },
    {
      sectionIndex: 1,
      title: 'JavaScript Fundamentals',
      questions: [
        { id: 1, question: 'Which keyword is used to declare a variable in modern JavaScript?', options: ['var', 'let', 'const', 'Both let and const'], correctIndex: 3, explanation: 'Both let and const are modern ways to declare variables, while var is the older method.' },
        { id: 2, question: 'What does the "===" operator check?', options: ['Value only', 'Type only', 'Value and type', 'Neither'], correctIndex: 2, explanation: 'The strict equality operator === checks both the value and the type.' },
        { id: 3, question: 'Which method removes the last element from an array?', options: ['shift()', 'unshift()', 'pop()', 'splice()'], correctIndex: 2, explanation: 'pop() removes and returns the last element of an array.' },
        { id: 4, question: 'What is the output of typeof null?', options: ['"null"', '"undefined"', '"object"', '"boolean"'], correctIndex: 2, explanation: 'Due to a historical bug in JavaScript, typeof null returns "object".' },
        { id: 5, question: 'Which array method creates a new array with all elements that pass a test?', options: ['map()', 'filter()', 'reduce()', 'find()'], correctIndex: 1, explanation: 'filter() creates a new array with elements that pass the provided test function.' },
      ],
    },
    {
      sectionIndex: 2,
      title: 'React - The Complete Guide',
      questions: [
        { id: 1, question: 'What is JSX?', options: ['A JavaScript library', 'A syntax extension for JavaScript', 'A CSS framework', 'A database query language'], correctIndex: 1, explanation: 'JSX is a syntax extension for JavaScript that lets you write HTML-like markup inside JavaScript.' },
        { id: 2, question: 'Which hook is used for side effects in React?', options: ['useState', 'useEffect', 'useContext', 'useRef'], correctIndex: 1, explanation: 'useEffect is used for side effects like data fetching, subscriptions, or DOM manipulation.' },
        { id: 3, question: 'What is the virtual DOM?', options: ['A real DOM element', 'A copy of the actual DOM kept in memory', 'A CSS rendering engine', 'A server-side concept'], correctIndex: 1, explanation: 'The virtual DOM is a lightweight in-memory representation of the real DOM that React uses to optimize updates.' },
        { id: 4, question: 'How do you pass data from parent to child component?', options: ['Through state', 'Through props', 'Through context only', 'Through refs'], correctIndex: 1, explanation: 'Props are the standard way to pass data from parent to child components in React.' },
        { id: 5, question: 'Which hook manages local component state?', options: ['useEffect', 'useContext', 'useState', 'useMemo'], correctIndex: 2, explanation: 'useState is the fundamental React hook for managing local state in functional components.' },
      ],
    },
    {
      sectionIndex: 3,
      title: 'Backend Development with Node.js',
      questions: [
        { id: 1, question: 'What is Node.js?', options: ['A frontend framework', 'A JavaScript runtime built on Chrome\'s V8 engine', 'A database system', 'A CSS preprocessor'], correctIndex: 1, explanation: 'Node.js is a JavaScript runtime that allows JavaScript to run on the server side.' },
        { id: 2, question: 'Which method is used to create an HTTP server in Node.js?', options: ['http.createServer()', 'server.create()', 'new Server()', 'http.listen()'], correctIndex: 0, explanation: 'http.createServer() creates a new HTTP server instance in Node.js.' },
        { id: 3, question: 'What does REST stand for?', options: ['Remote Execution State Transfer', 'Representational State Transfer', 'Real-time Event State Transfer', 'Resource-based Server Transfer'], correctIndex: 1, explanation: 'REST stands for Representational State Transfer, an architectural style for APIs.' },
        { id: 4, question: 'Which npm package is used to create a web server framework?', options: ['nodejs', 'express', 'server', 'http'], correctIndex: 1, explanation: 'Express.js is the most popular Node.js web framework for building APIs and web apps.' },
        { id: 5, question: 'What does async/await do in JavaScript?', options: ['Runs code faster', 'Makes asynchronous code look synchronous', 'Creates multiple threads', 'Prevents errors'], correctIndex: 1, explanation: 'async/await provides a cleaner syntax for working with Promises and asynchronous operations.' },
      ],
    },
    {
      sectionIndex: 4,
      title: 'Databases & MongoDB',
      questions: [
        { id: 1, question: 'What type of database is MongoDB?', options: ['Relational', 'Graph', 'Document-oriented NoSQL', 'Key-value'], correctIndex: 2, explanation: 'MongoDB is a document-oriented NoSQL database that stores data as JSON-like documents.' },
        { id: 2, question: 'Which command inserts a document in MongoDB?', options: ['db.insert()', 'db.collection.insertOne()', 'db.add()', 'db.create()'], correctIndex: 1, explanation: 'insertOne() and insertMany() are the modern MongoDB methods for inserting documents.' },
        { id: 3, question: 'What is an ODM for MongoDB in Node.js?', options: ['Express', 'Mongoose', 'Sequelize', 'Prisma'], correctIndex: 1, explanation: 'Mongoose is the most popular ODM (Object Document Mapper) for MongoDB in Node.js applications.' },
        { id: 4, question: 'What does CRUD stand for?', options: ['Create Read Update Delete', 'Connect Run Use Deploy', 'Code Review Unit Debug', 'Create Run Undo Delete'], correctIndex: 0, explanation: 'CRUD represents the four basic database operations: Create, Read, Update, Delete.' },
        { id: 5, question: 'Which MongoDB method finds all documents in a collection?', options: ['find()', 'findAll()', 'get()', 'select()'], correctIndex: 0, explanation: 'db.collection.find() returns all documents in a collection, optionally filtered by query.' },
      ],
    },
    {
      sectionIndex: 5,
      title: 'Web3 and Blockchain Basics',
      questions: [
        { id: 1, question: 'What is a blockchain?', options: ['A type of server', 'A distributed ledger of transactions', 'A programming language', 'A cloud service'], correctIndex: 1, explanation: 'A blockchain is a distributed, immutable ledger that records transactions across many computers.' },
        { id: 2, question: 'What is a smart contract?', options: ['A legal document', 'Self-executing code stored on a blockchain', 'A type of cryptocurrency', 'A web standard'], correctIndex: 1, explanation: 'Smart contracts are self-executing programs stored on a blockchain that run when predetermined conditions are met.' },
        { id: 3, question: 'Which programming language is used for Ethereum smart contracts?', options: ['JavaScript', 'Python', 'Solidity', 'Rust'], correctIndex: 2, explanation: 'Solidity is the primary language for writing smart contracts on the Ethereum blockchain.' },
        { id: 4, question: 'What is a crypto wallet?', options: ['A physical wallet', 'Software that stores private/public keys', 'A bank account', 'A trading platform'], correctIndex: 1, explanation: 'A crypto wallet stores the private and public keys needed to access and manage cryptocurrency.' },
        { id: 5, question: 'What does NFT stand for?', options: ['Network File Transfer', 'Non-Fungible Token', 'New Framework Technology', 'Node Function Type'], correctIndex: 1, explanation: 'NFT stands for Non-Fungible Token, a unique digital asset verified using blockchain technology.' },
      ],
    },
  ],

  // Course 2: Data Science and Machine Learning
  '2': [
    {
      sectionIndex: 0,
      title: 'Python Crash Course',
      questions: [
        { id: 1, question: 'What is Python?', options: ['A compiled language', 'An interpreted high-level programming language', 'A markup language', 'A database'], correctIndex: 1, explanation: 'Python is an interpreted, high-level, general-purpose programming language known for its readability.' },
        { id: 2, question: 'Which of these is a valid Python list?', options: ['(1, 2, 3)', '{1, 2, 3}', '[1, 2, 3]', '<1, 2, 3>'], correctIndex: 2, explanation: 'In Python, lists use square brackets [], tuples use (), and sets use {}.' },
        { id: 3, question: 'What does len() do in Python?', options: ['Prints a string', 'Returns the length of an object', 'Converts to integer', 'Checks type'], correctIndex: 1, explanation: 'len() is a built-in Python function that returns the number of items in an object.' },
        { id: 4, question: 'How do you define a function in Python?', options: ['function foo():', 'def foo():', 'func foo():', 'lambda foo():'], correctIndex: 1, explanation: 'Python uses the def keyword followed by the function name and parentheses to define a function.' },
        { id: 5, question: 'What does the range(5) function return?', options: ['[1,2,3,4,5]', '[0,1,2,3,4]', '[0,1,2,3,4,5]', '(1,2,3,4,5)'], correctIndex: 1, explanation: 'range(5) generates numbers from 0 up to (but not including) 5: 0, 1, 2, 3, 4.' },
      ],
    },
    {
      sectionIndex: 1,
      title: 'Data Analysis',
      questions: [
        { id: 1, question: 'What is Pandas used for?', options: ['Machine learning', 'Data manipulation and analysis', 'Web scraping', 'Database management'], correctIndex: 1, explanation: 'Pandas is a Python library providing high-performance data structures (DataFrame, Series) for data analysis.' },
        { id: 2, question: 'What is a DataFrame in Pandas?', options: ['A 1D array', 'A 2D labeled data structure', 'A dictionary', 'A Python list'], correctIndex: 1, explanation: 'A DataFrame is a 2-dimensional labeled data structure with rows and columns, like a spreadsheet.' },
        { id: 3, question: 'Which NumPy function creates an array of zeros?', options: ['np.zero()', 'np.empty()', 'np.zeros()', 'np.null()'], correctIndex: 2, explanation: 'np.zeros() creates a new array filled with zeros of the specified shape.' },
        { id: 4, question: 'What does df.describe() return?', options: ['Column names', 'Statistical summary of numeric columns', 'Data types', 'First 5 rows'], correctIndex: 1, explanation: 'describe() generates descriptive statistics (count, mean, std, min, quartiles, max) for numeric columns.' },
        { id: 5, question: 'How do you handle missing values in Pandas?', options: ['df.missing()', 'df.dropna() or df.fillna()', 'df.remove()', 'df.clean()'], correctIndex: 1, explanation: 'dropna() removes rows/columns with missing values; fillna() replaces them with a specified value.' },
      ],
    },
    {
      sectionIndex: 2,
      title: 'Machine Learning',
      questions: [
        { id: 1, question: 'What is supervised learning?', options: ['Learning without labels', 'Learning from labeled training data', 'Reinforcement learning', 'Unsupervised clustering'], correctIndex: 1, explanation: 'Supervised learning uses labeled training data where the model learns to map inputs to known outputs.' },
        { id: 2, question: 'What does overfitting mean?', options: ['Model too simple', 'Model performs too well on training data but poorly on new data', 'Model trained too fast', 'Too much data'], correctIndex: 1, explanation: 'Overfitting occurs when a model learns noise and details from training data that hurt its generalization.' },
        { id: 3, question: 'What is the purpose of train/test split?', options: ['Save memory', 'Evaluate model performance on unseen data', 'Speed up training', 'Reduce noise'], correctIndex: 1, explanation: 'Splitting data ensures the model is evaluated on data it has never seen, simulating real-world use.' },
        { id: 4, question: 'Which algorithm draws a hyperplane to separate classes?', options: ['K-Means', 'Decision Tree', 'Support Vector Machine', 'K-Nearest Neighbors'], correctIndex: 2, explanation: 'SVM finds the optimal hyperplane that maximizes the margin between different classes.' },
        { id: 5, question: 'What metric measures classification accuracy?', options: ['Mean Squared Error', 'R² Score', 'Accuracy Score', 'Mean Absolute Error'], correctIndex: 2, explanation: 'Accuracy score measures the proportion of correctly classified samples out of total samples.' },
      ],
    },
    {
      sectionIndex: 3,
      title: 'Deep Learning',
      questions: [
        { id: 1, question: 'What is a neural network inspired by?', options: ['Computer chips', 'The human brain', 'DNA structure', 'Graph theory'], correctIndex: 1, explanation: 'Artificial neural networks are loosely inspired by biological neural networks in the human brain.' },
        { id: 2, question: 'What is backpropagation?', options: ['Forward pass', 'Algorithm to update weights by propagating error backward', 'Data augmentation', 'Regularization technique'], correctIndex: 1, explanation: 'Backpropagation computes gradients of the loss function with respect to weights using the chain rule.' },
        { id: 3, question: 'What is the purpose of an activation function?', options: ['Initialize weights', 'Introduce non-linearity into the network', 'Normalize inputs', 'Define loss'], correctIndex: 1, explanation: 'Activation functions introduce non-linearity, allowing neural networks to learn complex patterns.' },
        { id: 4, question: 'What does CNN stand for?', options: ['Computer Neural Network', 'Convolutional Neural Network', 'Clustered Node Network', 'Connected Neuron Node'], correctIndex: 1, explanation: 'CNN stands for Convolutional Neural Network, widely used for image classification tasks.' },
        { id: 5, question: 'What is dropout in neural networks?', options: ['Removing the model', 'Randomly deactivating neurons during training to prevent overfitting', 'Reducing batch size', 'Lowering learning rate'], correctIndex: 1, explanation: 'Dropout randomly sets a fraction of neurons to zero during training, acting as regularization.' },
      ],
    },
  ],

  // Course 3: Digital Marketing
  '3': [
    {
      sectionIndex: 0,
      title: 'Digital Marketing Fundamentals',
      questions: [
        { id: 1, question: 'What is a conversion rate?', options: ['Website speed', 'Percentage of visitors who complete a desired action', 'Email open rate', 'Ad click cost'], correctIndex: 1, explanation: 'Conversion rate is the percentage of visitors who take a desired action (purchase, signup, etc.).' },
        { id: 2, question: 'What does KPI stand for?', options: ['Key Performance Indicator', 'Knowledge Process Integration', 'Key Productivity Index', 'Knowledge Point Index'], correctIndex: 0, explanation: 'KPI stands for Key Performance Indicator — a measurable value showing goal achievement.' },
        { id: 3, question: 'What is a target audience?', options: ['All internet users', 'A specific group most likely to buy your product', 'Your competitors', 'Your existing customers only'], correctIndex: 1, explanation: 'A target audience is the specific group of people most likely to be interested in your product or service.' },
        { id: 4, question: 'What is a marketing funnel?', options: ['A type of ad', 'The journey customers take from awareness to purchase', 'A social media tool', 'An email template'], correctIndex: 1, explanation: 'A marketing funnel represents the stages a customer goes through: Awareness → Interest → Decision → Action.' },
        { id: 5, question: 'What is A/B testing?', options: ['Testing two products', 'Comparing two versions to determine which performs better', 'A coding technique', 'User authentication method'], correctIndex: 1, explanation: 'A/B testing compares two versions of content to determine which achieves better results.' },
      ],
    },
    {
      sectionIndex: 1,
      title: 'SEO Mastery',
      questions: [
        { id: 1, question: 'What does SEO stand for?', options: ['Social Engagement Optimization', 'Search Engine Optimization', 'Site Enhancement Options', 'Structured Entry Operation'], correctIndex: 1, explanation: 'SEO stands for Search Engine Optimization — the process of improving website visibility in search results.' },
        { id: 2, question: 'What is a backlink?', options: ['A broken link', 'A link from another website to yours', 'An internal link', 'A sponsored link'], correctIndex: 1, explanation: 'A backlink is a hyperlink on another website that points to your website, improving domain authority.' },
        { id: 3, question: 'What is the most important on-page SEO element?', options: ['Image size', 'Page title and meta description', 'Footer links', 'Comment section'], correctIndex: 1, explanation: 'The title tag and meta description are crucial on-page elements that directly affect click-through rates.' },
        { id: 4, question: 'What does Google PageRank measure?', options: ['Page load speed', 'The importance of a page based on links', 'Content quality', 'Mobile friendliness'], correctIndex: 1, explanation: 'PageRank measures a page\'s importance based on the number and quality of links pointing to it.' },
        { id: 5, question: 'What is keyword density?', options: ['Number of keywords', 'How often a keyword appears relative to total word count', 'Keyword difficulty', 'Keyword competition'], correctIndex: 1, explanation: 'Keyword density is the percentage of times a keyword appears in content relative to total word count.' },
      ],
    },
    {
      sectionIndex: 2,
      title: 'Social Media Marketing',
      questions: [
        { id: 1, question: 'What is engagement rate?', options: ['Number of followers', 'Interactions (likes, comments, shares) divided by reach', 'Post frequency', 'Profile visits'], correctIndex: 1, explanation: 'Engagement rate measures the level of interaction content receives relative to its reach or followers.' },
        { id: 2, question: 'What is the best time to post on social media?', options: ['Midnight', 'When your target audience is most active', 'Monday mornings only', 'Any time'], correctIndex: 1, explanation: 'The best posting time varies by platform and audience — use analytics to find when your audience is most active.' },
        { id: 3, question: 'What is a hashtag used for?', options: ['Decoration', 'Categorizing content and increasing discoverability', 'Direct messaging', 'Paid advertising'], correctIndex: 1, explanation: 'Hashtags categorize content, making it discoverable to users searching for or following that topic.' },
        { id: 4, question: 'What is user-generated content (UGC)?', options: ['Content made by brands', 'Content created by customers/users about a brand', 'AI-generated content', 'Stock photography'], correctIndex: 1, explanation: 'UGC is content (reviews, photos, videos) created by real customers, which builds trust and authenticity.' },
        { id: 5, question: 'What is an influencer in marketing?', options: ['A CEO', 'A person with significant social media following who can affect purchasing decisions', 'A marketing software', 'A brand ambassador only'], correctIndex: 1, explanation: 'An influencer has a dedicated following and credibility in a niche, making their recommendations influential.' },
      ],
    },
    {
      sectionIndex: 3,
      title: 'Paid Advertising',
      questions: [
        { id: 1, question: 'What does PPC stand for?', options: ['Page Per Click', 'Pay Per Click', 'Performance Per Campaign', 'Profit Per Customer'], correctIndex: 1, explanation: 'PPC (Pay Per Click) is an advertising model where advertisers pay each time their ad is clicked.' },
        { id: 2, question: 'What is CTR?', options: ['Content Transfer Rate', 'Click-Through Rate', 'Customer Tracking Report', 'Cost Transfer Ratio'], correctIndex: 1, explanation: 'CTR (Click-Through Rate) is the percentage of ad impressions that result in a click.' },
        { id: 3, question: 'What is retargeting?', options: ['New audience targeting', 'Showing ads to users who previously visited your site', 'Email marketing', 'SEO strategy'], correctIndex: 1, explanation: 'Retargeting shows ads to users who have already visited your website or interacted with your brand.' },
        { id: 4, question: 'What is ROAS?', options: ['Return on Ad Spend', 'Rate of Ad Success', 'Revenue on Advertising', 'Return on Audience Size'], correctIndex: 0, explanation: 'ROAS (Return on Ad Spend) measures revenue earned for every dollar spent on advertising.' },
        { id: 5, question: 'What is the Quality Score in Google Ads?', options: ['Ad budget', 'A rating based on ad relevance, CTR, and landing page quality', 'Number of impressions', 'Competitor ranking'], correctIndex: 1, explanation: 'Quality Score (1-10) affects ad position and cost — higher scores mean better placement at lower cost.' },
      ],
    },
    {
      sectionIndex: 4,
      title: 'Email Marketing',
      questions: [
        { id: 1, question: 'What is an email open rate?', options: ['Emails sent', 'Percentage of recipients who opened the email', 'Email delivery rate', 'Spam rate'], correctIndex: 1, explanation: 'Open rate measures the percentage of delivered emails that were actually opened by recipients.' },
        { id: 2, question: 'What is email segmentation?', options: ['Blocking emails', 'Dividing email list into groups based on criteria', 'Email formatting', 'Spam filtering'], correctIndex: 1, explanation: 'Segmentation divides your email list into targeted groups for more relevant, personalized campaigns.' },
        { id: 3, question: 'What is a CTA in email marketing?', options: ['Content Template Area', 'Call To Action', 'Customer Tracking Analytics', 'Campaign Targeting Approach'], correctIndex: 1, explanation: 'A CTA (Call To Action) is a button or link that prompts readers to take a specific action.' },
        { id: 4, question: 'What is a double opt-in?', options: ['Two email addresses', 'Confirming subscription via a second verification email', 'Two emails per week', 'Two CTAs per email'], correctIndex: 1, explanation: 'Double opt-in requires subscribers to confirm their subscription, ensuring list quality and compliance.' },
        { id: 5, question: 'What does bounce rate mean in email?', options: ['Emails that were opened twice', 'Emails that could not be delivered', 'Emails forwarded', 'Emails marked as read'], correctIndex: 1, explanation: 'Email bounce rate is the percentage of emails that could not be delivered to the recipient\'s inbox.' },
      ],
    },
  ],

  // Course 4: Graphic Design
  '4': [
    {
      sectionIndex: 0,
      title: 'Design Fundamentals',
      questions: [
        { id: 1, question: 'What are the basic elements of design?', options: ['Colors only', 'Line, shape, space, texture, color, form, value', 'Fonts and images', 'Only symmetry and balance'], correctIndex: 1, explanation: 'The 7 basic design elements are: line, shape, space, texture, color, form, and value.' },
        { id: 2, question: 'What is visual hierarchy?', options: ['Alphabetical order', 'Arranging elements to show their order of importance', 'Symmetrical layout', 'Using only large fonts'], correctIndex: 1, explanation: 'Visual hierarchy guides viewers through a design by emphasizing the most important elements first.' },
        { id: 3, question: 'What is the rule of thirds?', options: ['Using 3 colors', 'Dividing a composition into 9 equal parts for better composition', 'Having 3 font sizes', 'Designing for 3 screen sizes'], correctIndex: 1, explanation: 'The rule of thirds divides an image into 9 equal parts — placing key elements on the intersections creates balance.' },
        { id: 4, question: 'What is white space in design?', options: ['White background', 'Empty space around design elements that improves readability', 'A specific design style', 'Unused canvas'], correctIndex: 1, explanation: 'White space (negative space) is the empty area around elements — it reduces clutter and improves focus.' },
        { id: 5, question: 'What does contrast do in design?', options: ['Adds confusion', 'Creates visual interest and makes elements stand out', 'Reduces colors', 'Limits fonts'], correctIndex: 1, explanation: 'Contrast highlights differences between elements (color, size, shape) to create visual interest and clarity.' },
      ],
    },
    {
      sectionIndex: 1,
      title: 'Logo Design & Branding',
      questions: [
        { id: 1, question: 'What makes a good logo?', options: ['Complex and detailed', 'Simple, memorable, versatile, and timeless', 'Uses many colors', 'Contains full company name'], correctIndex: 1, explanation: 'A great logo is simple, memorable, works at any size, looks good in black and white, and stands the test of time.' },
        { id: 2, question: 'What is a brand identity?', options: ['A logo only', 'The visual elements (logo, colors, typography) that represent a company', 'A tagline', 'A marketing campaign'], correctIndex: 1, explanation: 'Brand identity encompasses all visual elements that differentiate a brand: logo, colors, typography, imagery.' },
        { id: 3, question: 'What file format is best for logos?', options: ['JPG', 'PNG', 'SVG (vector)', 'GIF'], correctIndex: 2, explanation: 'SVG (Scalable Vector Graphics) is ideal for logos as it scales without losing quality at any size.' },
        { id: 4, question: 'What is a mood board?', options: ['A type of chart', 'A visual collage of images, colors, and text to convey design direction', 'A wireframe', 'A font selection tool'], correctIndex: 1, explanation: 'A mood board is a collage of visual references used to establish the style, tone, and direction of a design.' },
        { id: 5, question: 'What is kerning?', options: ['Letter height', 'Spacing between individual letters', 'Line spacing', 'Font weight'], correctIndex: 1, explanation: 'Kerning refers to the adjustment of space between individual characters in a text for visual balance.' },
      ],
    },
    {
      sectionIndex: 2,
      title: 'Typography Mastery',
      questions: [
        { id: 1, question: 'What is a serif font?', options: ['A font without decorative strokes', 'A font with small decorative strokes at the ends of letters', 'A handwriting font', 'A display font'], correctIndex: 1, explanation: 'Serif fonts have small decorative strokes (serifs) at the ends of characters. Example: Times New Roman.' },
        { id: 2, question: 'What is leading in typography?', options: ['Font weight', 'Vertical spacing between lines of text', 'Letter spacing', 'Font size'], correctIndex: 1, explanation: 'Leading is the vertical space between lines of text, affecting readability and visual comfort.' },
        { id: 3, question: 'How many fonts should a design typically use?', options: ['1', '2-3', '5-6', 'As many as possible'], correctIndex: 1, explanation: 'Good design typically uses 2-3 complementary fonts to maintain consistency and visual hierarchy.' },
        { id: 4, question: 'What does typographic hierarchy mean?', options: ['Alphabetical sorting', 'Using different type sizes/weights to show importance', 'Using one font', 'Centering all text'], correctIndex: 1, explanation: 'Typographic hierarchy guides readers through content by using different sizes, weights, and styles.' },
        { id: 5, question: 'What is tracking in typography?', options: ['Following trends', 'Uniform spacing across a range of characters', 'Font color', 'Text alignment'], correctIndex: 1, explanation: 'Tracking (letter-spacing) refers to the uniform adjustment of space across a group of characters.' },
      ],
    },
    {
      sectionIndex: 3,
      title: 'Color Theory',
      questions: [
        { id: 1, question: 'What are primary colors in traditional color theory?', options: ['Red, Green, Blue', 'Red, Yellow, Blue', 'Cyan, Magenta, Yellow', 'Orange, Green, Purple'], correctIndex: 1, explanation: 'In traditional (RYB) color theory, primary colors are Red, Yellow, and Blue — they cannot be made from other colors.' },
        { id: 2, question: 'What is a complementary color scheme?', options: ['Colors next to each other on the color wheel', 'Colors directly opposite on the color wheel', 'All warm colors', 'Three evenly spaced colors'], correctIndex: 1, explanation: 'Complementary colors are opposite each other on the color wheel (e.g., red and green) — they create high contrast.' },
        { id: 3, question: 'What does hue refer to?', options: ['Lightness', 'Saturation', 'The pure color itself', 'Transparency'], correctIndex: 2, explanation: 'Hue refers to the pure color itself (red, blue, green) without any tint, shade, or tone added.' },
        { id: 4, question: 'What does color saturation mean?', options: ['Darkness of color', 'Intensity or purity of a color', 'Color temperature', 'Number of colors used'], correctIndex: 1, explanation: 'Saturation describes the intensity or purity of a color. High saturation = vivid; low saturation = muted/gray.' },
        { id: 5, question: 'What psychological emotion does blue typically convey?', options: ['Urgency and danger', 'Trust, calm, and reliability', 'Happiness and energy', 'Luxury and creativity'], correctIndex: 1, explanation: 'Blue is commonly associated with trust, stability, calm, and reliability — which is why many tech companies use it.' },
      ],
    },
    {
      sectionIndex: 4,
      title: 'Layout & Composition',
      questions: [
        { id: 1, question: 'What is a grid system in design?', options: ['A table', 'A framework of lines used to align and organize design elements', 'A background pattern', 'A type of chart'], correctIndex: 1, explanation: 'A grid system is a series of intersecting vertical and horizontal lines used to create consistent, organized layouts.' },
        { id: 2, question: 'What is the golden ratio?', options: ['1:1 ratio', 'A mathematical ratio (~1.618) found in nature used for aesthetically pleasing compositions', '4:3 ratio', '16:9 ratio'], correctIndex: 1, explanation: 'The golden ratio (≈1.618:1) appears throughout nature and art, creating compositions that feel naturally balanced.' },
        { id: 3, question: 'What is alignment in design?', options: ['Using the same color', 'Positioning elements so they line up with each other', 'Using equal sizes', 'Rotating elements'], correctIndex: 1, explanation: 'Alignment creates order and connection between elements — left, right, center, or edge alignment.' },
        { id: 4, question: 'What is proximity in design?', options: ['Using similar colors', 'Grouping related elements together to show they are connected', 'Making elements the same size', 'Repeating patterns'], correctIndex: 1, explanation: 'Proximity groups related items together, creating visual connections and reducing clutter.' },
        { id: 5, question: 'What is a wireframe?', options: ['A 3D model', 'A basic structural blueprint of a design layout', 'A color palette', 'A style guide'], correctIndex: 1, explanation: 'A wireframe is a low-fidelity skeletal outline showing the basic structure and layout of a design.' },
      ],
    },
  ],

  // Course 5: iOS & Swift
  '5': [
    {
      sectionIndex: 0,
      title: 'Swift Fundamentals',
      questions: [
        { id: 1, question: 'What is Swift?', options: ['A web framework', 'Apple\'s programming language for iOS, macOS, and more', 'A database', 'A design tool'], correctIndex: 1, explanation: 'Swift is Apple\'s open-source, compiled programming language for building apps across Apple platforms.' },
        { id: 2, question: 'What is an optional in Swift?', options: ['A required value', 'A value that may or may not contain a value (nil)', 'A function', 'A class type'], correctIndex: 1, explanation: 'Optionals handle the absence of a value. A variable declared Optional can be nil (no value) or contain a value.' },
        { id: 3, question: 'What does "let" declare in Swift?', options: ['A variable', 'A constant (immutable value)', 'A function', 'A class'], correctIndex: 1, explanation: 'let declares a constant — its value cannot be changed after it is set. Use var for mutable variables.' },
        { id: 4, question: 'What is a struct in Swift?', options: ['A class with inheritance', 'A value type that encapsulates related data', 'A protocol', 'An enum'], correctIndex: 1, explanation: 'Structs are value types in Swift — they are copied when assigned or passed. Great for simple data models.' },
        { id: 5, question: 'What is optional binding in Swift?', options: ['Connecting two optionals', 'Safely unwrapping an optional using if let or guard let', 'Forcing an optional', 'Binding a function'], correctIndex: 1, explanation: 'Optional binding (if let / guard let) safely unwraps an optional, running code only if it contains a value.' },
      ],
    },
    {
      sectionIndex: 1,
      title: 'iOS Development Basics',
      questions: [
        { id: 1, question: 'What is the entry point of an iOS app?', options: ['main.swift', '@main / AppDelegate', 'ViewController.swift', 'Info.plist'], correctIndex: 1, explanation: 'In modern Swift, @main (or historically AppDelegate) serves as the entry point of an iOS application.' },
        { id: 2, question: 'What is Auto Layout?', options: ['Automatic code generation', 'A constraint-based layout system for building adaptive UIs', 'An animation framework', 'A testing framework'], correctIndex: 1, explanation: 'Auto Layout uses constraints to define the position and size of views, adapting to different screen sizes.' },
        { id: 3, question: 'What is a ViewController?', options: ['A data model', 'An object that manages a view and its subviews', 'A network request handler', 'A database controller'], correctIndex: 1, explanation: 'A UIViewController manages a view hierarchy, handling the presentation of content on screen.' },
        { id: 4, question: 'What is the MVC pattern in iOS?', options: ['Multiple View Controllers', 'Model-View-Controller architecture pattern', 'Mobile Version Control', 'Managed Value Configuration'], correctIndex: 1, explanation: 'MVC separates an app into Model (data), View (UI), and Controller (logic connecting them).' },
        { id: 5, question: 'What is the iOS simulator?', options: ['A real device', 'A software tool for testing apps on a simulated iPhone/iPad', 'A code debugger', 'An App Store preview'], correctIndex: 1, explanation: 'The Simulator in Xcode allows testing iOS apps on a simulated device without needing physical hardware.' },
      ],
    },
    {
      sectionIndex: 2,
      title: 'SwiftUI Mastery',
      questions: [
        { id: 1, question: 'What is SwiftUI?', options: ['A game engine', 'Apple\'s declarative UI framework for building apps across all Apple platforms', 'A database framework', 'A testing library'], correctIndex: 1, explanation: 'SwiftUI is Apple\'s modern declarative framework for building UIs across iOS, macOS, watchOS, and tvOS.' },
        { id: 2, question: 'What does @State do in SwiftUI?', options: ['Fetches data from server', 'Declares mutable state local to a view that triggers re-rendering when changed', 'Connects to database', 'Defines animations'], correctIndex: 1, explanation: '@State declares mutable state owned by a view. When it changes, the view automatically re-renders.' },
        { id: 3, question: 'What is a View in SwiftUI?', options: ['A UIViewController', 'Any struct that conforms to the View protocol with a body property', 'An animation', 'A data model'], correctIndex: 1, explanation: 'In SwiftUI, a View is any struct conforming to the View protocol — it describes what to display.' },
        { id: 4, question: 'What is @Binding in SwiftUI?', options: ['Connecting to a server', 'A two-way connection to state owned by a parent view', 'A local variable', 'An animation binding'], correctIndex: 1, explanation: '@Binding creates a two-way reference to state that lives in a parent — changes propagate both ways.' },
        { id: 5, question: 'How do you navigate between views in SwiftUI?', options: ['segue()', 'NavigationStack and NavigationLink', 'present()', 'UINavigationController'], correctIndex: 1, explanation: 'SwiftUI uses NavigationStack (iOS 16+) or NavigationView with NavigationLink to navigate between views.' },
      ],
    },
    {
      sectionIndex: 3,
      title: 'Advanced iOS Features',
      questions: [
        { id: 1, question: 'What is Core Data used for?', options: ['Networking', 'Persisting data locally on the device', 'UI animations', 'Push notifications'], correctIndex: 1, explanation: 'Core Data is Apple\'s framework for persisting, managing, and querying data stored locally on a device.' },
        { id: 2, question: 'What is URLSession used for?', options: ['Managing UI sessions', 'Making HTTP network requests in iOS', 'Core Data queries', 'User authentication only'], correctIndex: 1, explanation: 'URLSession is the primary iOS API for making HTTP/HTTPS network requests to servers.' },
        { id: 3, question: 'What is async/await in Swift?', options: ['A loop construct', 'A modern concurrency approach to write asynchronous code that reads synchronously', 'A type system feature', 'A testing framework'], correctIndex: 1, explanation: 'Swift\'s async/await (introduced in Swift 5.5) allows writing asynchronous code in a sequential, readable style.' },
        { id: 4, question: 'What is ARKit?', options: ['A coding language', 'Apple\'s augmented reality framework for iOS apps', 'An audio framework', 'An app review kit'], correctIndex: 1, explanation: 'ARKit is Apple\'s framework for creating augmented reality experiences, combining device camera with 3D content.' },
        { id: 5, question: 'What is the purpose of UserDefaults?', options: ['Setting app theme', 'Storing small amounts of data persistently across app launches', 'User interface defaults', 'Default error messages'], correctIndex: 1, explanation: 'UserDefaults stores small amounts of user preferences/settings that persist even after the app is closed.' },
      ],
    },
    {
      sectionIndex: 4,
      title: 'Publishing Your App',
      questions: [
        { id: 1, question: 'What is needed to submit to the App Store?', options: ['Only a MacBook', 'An Apple Developer Program membership ($99/year)', 'A paid iCloud plan', 'An iPhone'], correctIndex: 1, explanation: 'Submitting to the App Store requires an active Apple Developer Program membership costing $99/year.' },
        { id: 2, question: 'What is TestFlight?', options: ['A unit testing framework', 'Apple\'s platform for beta testing iOS apps before App Store release', 'A flight booking app', 'An app analytics tool'], correctIndex: 1, explanation: 'TestFlight lets you distribute beta versions of your app to up to 10,000 testers before public release.' },
        { id: 3, question: 'What is App Store Optimization (ASO)?', options: ['Code optimization', 'Improving app visibility and conversion in the App Store', 'App size reduction', 'Battery optimization'], correctIndex: 1, explanation: 'ASO optimizes your App Store listing (title, keywords, screenshots, reviews) to increase discoverability and downloads.' },
        { id: 4, question: 'What is a bundle identifier?', options: ['A version number', 'A unique string identifying your app (e.g. com.company.appname)', 'A device ID', 'An API key'], correctIndex: 1, explanation: 'A bundle identifier is a unique reverse-domain string (com.company.app) that identifies your app in Apple\'s ecosystem.' },
        { id: 5, question: 'What does Xcode Instruments help with?', options: ['UI design', 'Profiling app performance (memory, CPU, energy)', 'Writing tests', 'Submitting to App Store'], correctIndex: 1, explanation: 'Xcode Instruments is a performance analysis toolset for profiling memory usage, CPU, energy, and more.' },
      ],
    },
  ],
};
