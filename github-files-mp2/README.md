# 🍸 Cocktail Companion - Web Application

A dynamic, responsive cocktail recipe finder and mixology web application built with **Node.js**, **Express.js**, **EJS**, and **Axios**.

This project connects to public, CORS-friendly REST APIs to let users search for cocktails, browse drink categories, generate random surprise recipes, view complete ingredient checklists and mixing instructions, and discover complementary food pairings and bar humor.

---

## 🚀 Features

- **Search Cocktail Recipes**: Search by cocktail name (e.g., Margarita, Mojito, Old Fashioned, Martini) to retrieve real-time recipes from **TheCocktailDB API**.
- **Complete Recipe Breakdown**: Displays high-resolution photos, glassware type, alcohol status (Alcoholic vs. Non-Alcoholic), structured ingredient checklists with exact measurements, and step-by-step preparation instructions.
- **Surprise Me / Random Cocktail**: One-click button that fetches a random cocktail recipe from across the globe.
- **Bonus Feature 1 - Category Filtering**: Browse drinks by category (*Cocktail*, *Ordinary Drink*, *Shot*, *Punch / Party Drink*, *Beer*, *Coffee / Tea*, *Soft Drink*, etc.) with interactive category dropdown and quick-filter pills.
- **Bonus Feature 2 - Second API Integration (TheMealDB)**: Pairs every cocktail with a live "Chef's Recommended Food Pairing / Bar Snack" fetched from **TheMealDB API**.
- **Bar Humor (JokeAPI)**: Includes a live "Bartender's Icebreaker / Joke of the Day" on the homepage and drink recipe pages.
- **Graceful Error Handling**: Validates user input and gracefully catches empty searches, missing cocktails, and network errors with friendly prompts to try again.
- **Responsive Design**: Clean, modern CSS layout that adapts across mobile phones, tablets, and desktop displays.

---

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (v18+ or v20+)
- **Backend Framework**: [Express.js](https://expressjs.com/)
- **Templating Engine**: [EJS](https://ejs.co/) (Embedded JavaScript)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Styling**: Pure responsive CSS3
- **External Public APIs**:
  1. [TheCocktailDB API](https://www.thecocktaildb.com/api.php) - Primary cocktail search, random recipes, and category filters (Free, CORS-enabled, no authentication).
  2. [TheMealDB API](https://www.themealdb.com/api.php) - Secondary API for chef food and snack pairings (Free, CORS-enabled, no authentication).
  3. [JokeAPI](https://sv443.net/jokeapi/v2/) - Bar table humor and icebreakers (Free, CORS-enabled, no authentication).

---

## 📁 Project Structure

```text
cs312-miniproject-2/
├── index.js              # Express server, Axios API calls, routing & error handling
├── package.json          # Node dependencies & scripts
├── test_app.js           # Automated test suite for all routes and APIs
├── .gitignore            # Excludes node_modules and logs
├── README.md             # Documentation, API architecture & video guide
├── public/
│   └── styles.css        # Responsive stylesheet matching clean course design
└── views/
    ├── index.ejs         # Homepage: Search form, featured drink, category filter & joke
    ├── search-results.ejs# Search results gallery with drink cards
    ├── recipe.ejs        # Full recipe: Ingredients, instructions, food pairing & joke
    ├── category.ejs      # Category gallery with category switcher
    └── error.ejs         # User-friendly error page with retry prompt
```

---

## 💻 Getting Started Locally

### 1. Prerequisites
Make sure Node.js (version 18+ or 20+ LTS) is installed. You can check by running:
```bash
node -v
npm -v
```

### 2. Installation
Navigate to the project directory and install dependencies:
```bash
cd cs312-miniproject-2
npm install
```

### 3. Running the Server
Start the Express server:
```bash
npm start
```

You will see:
```text
=========================================
  🍸 Cocktail Companion server is running!
  Visit: http://localhost:3000
  Press Ctrl + C to stop
=========================================
```

Open your browser and navigate to:
[http://localhost:3000](http://localhost:3000)

### 4. Running the Automated Tests
Verify all endpoints and API integrations:
```bash
npm test
```

---

## 🌐 API Architecture & Implementation Details

### Step 1: Chosen APIs
1. **TheCocktailDB**:
   - `search.php?s={query}`: Searches cocktail records.
   - `lookup.php?i={id}`: Fetches complete recipe details.
   - `random.php`: Retrieves a random drink.
   - `filter.php?c={category}`: Retrieves drinks belonging to a specific category.
   - `list.php?c=list`: Retrieves the list of available categories.
2. **TheMealDB (Bonus API 2)**:
   - `random.php`: Fetches a random complementary food recipe to serve with the drink.
3. **JokeAPI (Bonus Humor)**:
   - `Programming,Pun?blacklistFlags=nsfw,religious,political,racist,sexist,explicit`: Fetches clean jokes.

### Data Normalization & Formatting
The CocktailDB API stores ingredients across numbered keys (`strIngredient1` through `strIngredient15`) and measures (`strMeasure1` through `strMeasure15`). 
In `index.js`, the helper function `formatDrink()` loops through these keys and consolidates non-null entries into a clean array:
```javascript
ingredients: [
  { name: "Tequila", measure: "1 1/2 oz" },
  { name: "Triple sec", measure: "1/2 oz" },
  { name: "Lime juice", measure: "1 oz" }
]
```
This is passed into EJS for clean server-side rendering without messy view logic.

---

## 🎥 Video Demonstration Talking Points (Bonus Features)

When recording your project video walkthrough:

1. **Introduction**:
   - Introduce yourself and state your project name (*Cocktail Companion*).
   - Explain the core tech stack: Node.js, Express.js, EJS for server-side rendering, and Axios for external HTTP calls.

2. **Step 1 & Step 4 (Search & API Integration)**:
   - Show the search bar on the homepage.
   - Search for *"Margarita"* or *"Mojito"*.
   - Point out how the input form sends a GET request to `/search`, which triggers Axios to query TheCocktailDB API.
   - Click **"View Recipe"** to show how server-side rendering formats the ingredients, measurements, and instructions.
   - Demonstrate error handling: Type a gibberish word like *"xyzabc123"* and show the friendly error message prompting the user to try again.

3. **Bonus Challenge 1: Category Feature**:
   - Scroll to the **"Browse by Category"** section.
   - Select a category (e.g., *"Shot"* or *"Ordinary Drink"*).
   - Explain that this calls `filter.php?c={category}` to retrieve only drinks within that classification.
   - Show the resulting drink grid and click through to any drink recipe.

4. **Bonus Challenge 2: Second API Implementation**:
   - Open any cocktail recipe page.
   - Scroll down to highlight the **"Chef's Recommended Food Pairing"** section.
   - Explain: *"To make the app more dynamic, I integrated a second API—TheMealDB API. Whenever a user views a cocktail, the server simultaneously queries TheMealDB to recommend a complementary food recipe with its own photo and instructions."*
   - Also highlight the **"Bartender's Table Joke"** section powered by JokeAPI.

---

## 🌐 Setting Up and Pushing to GitHub

Follow these steps to push your project to a new repository on GitHub:

```bash
# 1. Initialize git
git init

# 2. Add all files
git add .

# 3. Create initial commit
git commit -m "Initial commit: Cocktail Companion Node.js app with multi-API integration"

# 4. Rename default branch to main
git branch -M main

# 5. Add your GitHub repository remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 6. Push to GitHub
git push -u origin main
```
