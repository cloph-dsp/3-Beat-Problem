"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var statemanager_js_1 = require("./statemanager.js");
var uicontroller_js_1 = require("./uicontroller.js");
var audioengine_js_1 = require("./audioengine.js");
// Main application initialization
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded. Initializing application.');
    // Initialize State Manager first to load any saved state
    (0, statemanager_js_1.loadStateFromLocalStorage)(); // Load state immediately
    // Initialize Audio Engine
    (0, audioengine_js_1.init)();
    var analyzerNodes = (0, audioengine_js_1.getAnalyzerNodes)();
    // Initialize UI Controller with analyzer nodes for visualization
    (0, uicontroller_js_1.init)(analyzerNodes);
    console.log('Application initialized.');
});
// Optional: Add a mechanism to save state before the user leaves the page
window.addEventListener('beforeunload', function () {
    // The statemanager already saves state on every dispatch,
    // but this can be a final save just in case.
    // No explicit action needed here if statemanager handles it.
    console.log('Saving state before unload.');
});
