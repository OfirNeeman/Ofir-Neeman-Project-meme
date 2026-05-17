import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

//מחבר בין React ל-DOM ומטען את האפליקציה הראשית (App) לתוך האלמנט עם ה-ID "root" בדף ה-HTML
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);