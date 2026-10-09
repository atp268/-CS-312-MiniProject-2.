Cocktail Companion
---

##  Features

- **Search Cocktail Recipes**: Search by cocktail name (e.g., Margarita, Mojito, Old Fashioned, Martini) to retrieve real-time recipes from **TheCocktailDB API**.
- **Complete Recipe Breakdown**: Displays high-resolution photos, glassware type, alcohol status (Alcoholic vs. Non-Alcoholic), structured ingredient checklists with exact measurements, and step-by-step preparation instructions.
- **Surprise Me / Random Cocktail**: One-click button that fetches a random cocktail recipe from across the globe.
- **Bonus Feature 1 - Category Filtering**: Browse drinks by category (*Cocktail*, *Ordinary Drink*, *Shot*, *Punch / Party Drink*, *Beer*, *Coffee / Tea*, *Soft Drink*, etc.) with interactive category dropdown and quick-filter pills.
- **Bonus Feature 2 - Second API Integration (TheMealDB)**: Pairs every cocktail with a live "Chef's Recommended Food Pairing / Bar Snack" fetched from **TheMealDB API**.
- **Bar Humor (JokeAPI)**: Includes a live "Bartender's Icebreaker / Joke of the Day" on the homepage and drink recipe pages.
- **Graceful Error Handling**: Validates user input and gracefully catches empty searches, missing cocktails, and network errors with friendly prompts to try again.
- **Responsive Design**: Clean, modern CSS layout that adapts across mobile phones, tablets, and desktop displays.

---

- **External Public APIs**:
  1. [TheCocktailDB API](https://www.thecocktaildb.com/api.php) - Primary cocktail search, random recipes, and category filters (Free, CORS-enabled, no authentication).
  2. [TheMealDB API](https://www.themealdb.com/api.php) - Secondary API for chef food and snack pairings (Free, CORS-enabled, no authentication).
  3. [JokeAPI](https://sv443.net/jokeapi/v2/) - Bar table humor and icebreakers (Free, CORS-enabled, no authentication).

---



## Getting Started Locally

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



# 6. Push to GitHub
git push -u origin main
```
