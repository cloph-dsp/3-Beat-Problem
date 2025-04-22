import { loadStateFromLocalStorage } from './statemanager.js';
import { init as initUIController, visualize } from './uicontroller.js';
import { init as initAudioEngine, getAnalyzerNodes } from './audioengine.js';

// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded. Initializing application.');

  // Initialize State Manager first to load any saved state
  loadStateFromLocalStorage(); // Load state immediately

  // Initialize Audio Engine
  initAudioEngine();
  const analyzerNodes = getAnalyzerNodes();

  // Initialize UI Controller with analyzer nodes for visualization
  initUIController(analyzerNodes);


  console.log('Application initialized.');
});

// Optional: Add a mechanism to save state before the user leaves the page
window.addEventListener('beforeunload', () => {
  // The statemanager already saves state on every dispatch,
  // but this can be a final save just in case.
  // No explicit action needed here if statemanager handles it.
  console.log('Saving state before unload.');
});