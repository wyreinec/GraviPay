# Stateless Split Bill App

A lightweight, lightning-fast, and privacy-focused web application designed to help friends and groups easily calculate and split their bills.

## 🌟 Features

- **100% Client-Side**: No backend, no accounts, and no phone numbers required. All data is processed entirely on your device, ensuring maximum privacy.
- **Copyable WhatsApp Summaries**: Generate flawlessly formatted text summaries for each person with a single click, ready to be pasted directly into WhatsApp, Telegram, or Line.
- **Advanced Calculation Engine**: Accurately prorates percentage-based tax, service/admin charges, and shipping/misc fees proportionally strictly based on each person's individual subtotal.
- **Versatile Categories**: Built-in formatting and tagging for Dining, Groceries, Transport, Travel, Utilities, Shopping, and more.
- **Flexible Promos & Discounts**: Add multiple vouchers or promos simultaneously (as flat nominal amounts, or relative percentages).
- **Session History Tracker**: Safely and automatically saves past bills to your browser's local storage so you never lose track of who owes you. The app protects against accidental browser refreshes effortlessly.
- **Aggregated Unpaid Reminders**: Instantly generate a personalized group message summarizing exactly who hasn't paid their debt yet across a specific bill.
- **Advanced Filters & Sorting**: Dynamically filter your past history by Payment Status, Host Creator, Platform, and Date.
- **Premium UI & Themes**: Responsive, modern glassmorphism design with a native built-in **Light** & **Dark** Mode toggle.

## 🚀 How to Run Locally

Because the application is entirely stateless, there are no build tools (like Node.js, Webpack, etc.) or databases required.

1. **Clone the repository** or download the files.
2. Simply double-click on `index.html` to open it in your browser.
3. ***(Optional)*** If you want to run it over a local development server, you can use Python:
   ```bash
   python -m http.server 8000
   ```
   Then navigate to `http://localhost:8000`.

## 🌐 Hosting on GitHub Pages

This app is tailor-made for GitHub Pages since it consists only of Static files.

1. Create a repository and push this code to the `main` branch.
2. Go to **Settings** > **Pages**.
3. Set the source branch to `main` and save.
4. Your split bill app will immediately be live and accessible to the world for free!

## 🛠️ Tech Stack

- **HTML5** (Structural integrity and native input handling)
- **Vanilla CSS3** (Custom design system, flex-gaps, CSS variable theming)
- **Vanilla JavaScript** (Browser DOM manipulation, mathematically accurate algorithms, LocalStorage parsing)

---
*Split Bill app v1.0.0. Created by Yohana Sri Rejeki*
