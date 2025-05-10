import RaceTimer from './timer.js';

/**
 * Show a notification to the user
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the notification in milliseconds
 */
function showNotification(message, duration = 3000) {
  const notification = document.querySelector('#notification');
  if (!notification) return;

  notification.textContent = message;
  notification.classList.remove('hidden');

  setTimeout(() => {
    notification.classList.add('hidden');
  }, duration);
}

/**
 * Race Control Application
 * Main application logic
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize app components
  const app = new RaceControlApp();
  app.init();
});

class RaceControlApp {
  constructor() {
    // Initialize state
    this.currentScreen = 'home-screen';
    this.currentRaceId = null;
    this.currentRace = null;
    this.raceTimer = new RaceTimer();
    this.results = [];

    // Cache DOM elements
    this.screens = {
      home: document.querySelector('#home-screen'),
      createRace: document.querySelector('#create-race-screen'),
      racesList: document.querySelector('#races-list-screen'),
      raceControl: document.querySelector('#race-control-screen'),
      results: document.querySelector('#results-screen'),
    };

    // Button elements
    this.buttons = {
      createRace: document.querySelector('#create-race-button'),
      viewRaces: document.querySelector('#view-races-button'),
      cancelCreate: document.querySelector('#cancel-create'),
      backToHome: document.querySelector('#back-to-home'),
      startTimer: document.querySelector('#start-timer-button'),
      recordFinish: document.querySelector('#record-button'),
      endRace: document.querySelector('#end-race-button'),
      uploadResults: document.querySelector('#upload-results-button'),
      clearResults: document.querySelector('#clear-results-button'),
      backToRaces: document.querySelector('#back-to-races'),
      backFromResults: document.querySelector('#back-from-results'),
      syncNow: document.querySelector('#sync-now-button'),
    };

    // Forms
    this.forms = {
      createRace: document.querySelector('#create-race-form'),
      recordFinish: document.querySelector('#record-finish-form'),
    };

    // Other elements
    this.elements = {
      racesContainer: document.querySelector('#races-container'),
      raceNameDisplay: document.querySelector('#race-name-display'),
      resultsRaceName: document.querySelector('#results-race-name'),
      resultsList: document.querySelector('#results-list'),
      resultsTableContainer: document.querySelector('#results-table-container'),
      runnerInput: document.querySelector('#runner-input'),
      runnerNumber: document.querySelector('#runner-number'),
    };
  }

  /**
   * Initialize the application
   */
  init() {
    this.bindEventListeners();
    this.showScreen('home-screen');
  }

  /**
   * Bind event listeners to UI elements
   */
  bindEventListeners() {
    // Navigation buttons
    this.buttons.createRace.addEventListener('click', () => this.showScreen('create-race-screen'));
    this.buttons.viewRaces.addEventListener('click', () => this.loadRaces());
    this.buttons.cancelCreate.addEventListener('click', () => this.showScreen('home-screen'));
    this.buttons.backToHome.addEventListener('click', () => this.showScreen('home-screen'));
    this.buttons.backToRaces.addEventListener('click', () => this.loadRaces());
    this.buttons.backFromResults.addEventListener('click', () => this.loadRaces());

    // Race control buttons
    this.buttons.startTimer.addEventListener('click', () => this.startRace());
    this.buttons.recordFinish.addEventListener('click', () => this.showRunnerInput());
    this.buttons.endRace.addEventListener('click', () => this.endRace());
    this.buttons.uploadResults.addEventListener('click', () => this.uploadResults());
    this.buttons.clearResults.addEventListener('click', () => this.clearResults());

    // Sync button
    if (this.buttons.syncNow) {
      this.buttons.syncNow.addEventListener('click', () => window.offlineStorage.syncResults());
    }

    // Forms
    this.forms.createRace.addEventListener('submit', (e) => {
      e.preventDefault();
      this.createRace();
    });

    this.forms.recordFinish.addEventListener('submit', (e) => {
      e.preventDefault();
      this.recordFinish();
    });
  }

  /**
   * Show a specific screen and hide others
   * @param {string} screenId - The ID of the screen to show
   */
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Fix: Use screenId variable instead of hard-coded string
    document.querySelector(`#${screenId}`).classList.add('active');
    this.currentScreen = screenId;

    // Special handling for screens
    if (screenId === 'race-control-screen') {
      // Initialize timer display
      this.raceTimer.updateDisplay();
    }
  }

  /**
   * Create a new race
   */
  async createRace() {
    const nameInput = document.querySelector('#race-name');
    const dateInput = document.querySelector('#race-date');

    const name = nameInput.value.trim();
    const date = dateInput.value;

    if (!name || !date) {
      showNotification('Please fill in all fields', 3000);
      return;
    }

    try {
      // Check if we're online first
      if (!window.offlineStorage.isDeviceOnline()) {
        showNotification('Cannot create races while offline', 3000);
        return;
      }

      const response = await fetch('/api/races', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, date }),
      });

      if (!response.ok) {
        throw new Error('Failed to create race');
      }

      const race = await response.json();

      // Reset the form
      nameInput.value = '';
      dateInput.value = '';

      // Show the race control screen
      this.loadRaceControl(race.id);
    } catch (error) {
      console.error('Create race error:', error);
      showNotification('Failed to create race', 3000);
    }
  }

  /**
   * Load the list of races
   */
  async loadRaces() {
    try {
      // Check if we're online first
      if (!window.offlineStorage.isDeviceOnline()) {
        showNotification('Cannot load races while offline', 3000);
        return;
      }

      const response = await fetch('/api/races');

      if (!response.ok) {
        throw new Error('Failed to load races');
      }

      const races = await response.json();

      // Clear the container
      this.elements.racesContainer.innerHTML = '';

      if (races.length === 0) {
        this.elements.racesContainer.innerHTML = '<p>No races found</p>';
      } else {
        // Add each race to the container
        races.forEach(race => {
          const raceCard = document.createElement('div');
          raceCard.className = 'race-card';

          const status = race.status === 'pending'
            ? 'Not Started'
            : race.status === 'active' ? 'In Progress' : 'Completed';

          const date = new Date(race.date).toLocaleDateString();

          raceCard.innerHTML = `
            <h3>${race.name}</h3>
            <p>Date: ${date}</p>
            <p>Status: ${status}</p>
            <div class="race-card-buttons">
              <button class="primary-button control-button">Control Race</button>
              <button class="secondary-button results-button">View Results</button>
              ${race.status === 'completed' ? '<button class="danger-button delete-button">Delete Race</button>' : ''}
            </div>
          `;

          // Add event listeners
          raceCard.querySelector('.control-button').addEventListener('click', () => {
            this.loadRaceControl(race.id);
          });

          raceCard.querySelector('.results-button').addEventListener('click', () => {
            this.loadRaceResults(race.id);
          });

          // Add delete button event listener if race is completed
          if (race.status === 'completed') {
            raceCard.querySelector('.delete-button').addEventListener('click', () => {
              this.confirmDeleteRace(race.id, race.name);
            });
          }

          this.elements.racesContainer.appendChild(raceCard);
        });
      }

      // Show the races list screen
      this.showScreen('races-list-screen');
    } catch (error) {
      console.error('Load races error:', error);
      showNotification('Failed to load races', 3000);
    }
  }

  /**
   * Load the race control screen for a specific race
   * @param {number} raceId - The ID of the race to control
   */
  async loadRaceControl(raceId) {
    try {
      // Check if we're online first to load race details
      if (!window.offlineStorage.isDeviceOnline()) {
        showNotification('Cannot load race details while offline', 3000);
        return;
      }

      const response = await fetch(`/api/races/${raceId}`);

      if (!response.ok) {
        throw new Error('Failed to load race details');
      }

      const race = await response.json();
      this.currentRace = race;
      this.currentRaceId = raceId;

      // Update the race name display
      this.elements.raceNameDisplay.textContent = race.name;

      // Reset results
      this.results = [];
      this.updateResultsList();

      // Reset and update timer
      this.raceTimer.reset();

      // Update button states based on race status
      if (race.status === 'pending') {
        this.buttons.startTimer.disabled = false;
        this.buttons.recordFinish.disabled = true;
        this.buttons.endRace.disabled = true;
        this.buttons.uploadResults.disabled = true;
        this.buttons.clearResults.disabled = true;
        this.elements.runnerInput.classList.add('hidden');
      } else if (race.status === 'active') {
        this.buttons.startTimer.disabled = true;
        this.buttons.recordFinish.disabled = false;
        this.buttons.endRace.disabled = false;
        this.buttons.uploadResults.disabled = false;
        this.buttons.clearResults.disabled = false;

        // Start the timer with the saved start time
        if (race.startTime) {
          this.raceTimer.start(parseInt(race.startTime));
        }
      } else {
        // Race is completed
        this.buttons.startTimer.disabled = true;
        this.buttons.recordFinish.disabled = true;
        this.buttons.endRace.disabled = true;
        this.buttons.uploadResults.disabled = false;
        this.buttons.clearResults.disabled = false;
        this.elements.runnerInput.classList.add('hidden');

        // Show the timer at its final state
        if (race.startTime) {
          this.raceTimer.start(parseInt(race.startTime));
          this.raceTimer.stop();
        }
      }

      // Check for locally stored results for this race
      const storedData = window.offlineStorage.getStoredData();
      if (storedData && storedData.raceId === raceId && storedData.results) {
        this.results = storedData.results;
        this.updateResultsList();
        this.buttons.uploadResults.disabled = false;
        this.buttons.clearResults.disabled = false;
      }

      // Show the race control screen
      this.showScreen('race-control-screen');
    } catch (error) {
      console.error('Load race control error:', error);
      showNotification('Failed to load race control', 3000);
    }
  }

  /**
   * Start the race
   */
  async startRace() {
    if (!this.currentRaceId) {
      showNotification('No race selected', 3000);
      return;
    }

    try {
      // Check if we're online first
      if (!window.offlineStorage.isDeviceOnline()) {
        showNotification('Cannot start race while offline', 3000);
        return;
      }

      // Start the timer
      const startTime = this.raceTimer.start();

      const response = await fetch(`/api/races/${this.currentRaceId}/start`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startTime }),
      });

      if (!response.ok) {
        // Stop the timer if the request failed
        this.raceTimer.stop();
        throw new Error('Failed to start race');
      }

      // Update current race data
      const updatedRace = await response.json();
      this.currentRace = {
        ...this.currentRace,
        startTime: updatedRace.startTime,
        status: updatedRace.status,
      };

      // Update button states
      this.buttons.startTimer.disabled = true;
      this.buttons.recordFinish.disabled = false;
      this.buttons.endRace.disabled = false;
      this.buttons.uploadResults.disabled = false;
      this.buttons.clearResults.disabled = false;

      showNotification('Race started', 3000);
    } catch (error) {
      console.error('Start race error:', error);
      showNotification('Failed to start race', 3000);
    }
  }

  /**
   * Show the runner input form
   */
  showRunnerInput() {
    this.elements.runnerInput.classList.remove('hidden');
    this.elements.runnerNumber.value = '';
    this.elements.runnerNumber.focus();
  }

  /**
   * Record a runner finish
   */
  recordFinish() {
    if (!this.currentRaceId) {
      showNotification('No race selected', 3000);
      return;
    }

    if (!this.raceTimer.isRunning) {
      showNotification('Race timer not running', 3000);
      return;
    }

    const runnerNumber = parseInt(this.elements.runnerNumber.value);
    if (isNaN(runnerNumber) || runnerNumber <= 0) {
      showNotification('Invalid runner number', 3000);
      return;
    }

    // Record the finish time
    const finishTime = this.raceTimer.recordFinish();

    // Calculate race time
    const raceTime = finishTime - this.raceTimer.startTime;

    // Create result object
    const result = {
      runnerNumber,
      finishTime,
      raceTime,
    };

    // Add to local results
    this.results.push(result);

    // Store results locally for offline support
    window.offlineStorage.storeResult({
      raceId: this.currentRaceId,
      runnerNumber,
      finishTime,
    });

    // Update the results list
    this.updateResultsList();

    // Hide the runner input
    this.elements.runnerInput.classList.add('hidden');

    // Enable upload and clear buttons
    this.buttons.uploadResults.disabled = false;
    this.buttons.clearResults.disabled = false;

    showNotification(`Runner ${runnerNumber} recorded`, 2000);
  }

  /**
   * Update the results list display
   */
  updateResultsList() {
    if (!this.elements.resultsList) return;

    // Clear the list
    this.elements.resultsList.innerHTML = '';

    if (this.results.length === 0) {
      this.elements.resultsList.innerHTML = '<p>No results recorded yet</p>';
      return;
    }

    // Sort results by finish time (ascending)
    const sortedResults = [...this.results].sort((a, b) => a.finishTime - b.finishTime);

    // Add results count
    const resultsCount = document.createElement('div');
    resultsCount.className = 'results-count';
    resultsCount.textContent = `${sortedResults.length} runners recorded`;
    this.elements.resultsList.appendChild(resultsCount);

    // Only show the most recent 10 results to avoid performance issues
    const recentResults = sortedResults.slice(-10);

    // Add each result to the list
    recentResults.forEach((result) => {
      const resultItem = document.createElement('div');
      resultItem.className = 'result-item';

      const raceTimeFormatted = this.raceTimer.formatTimeVerbose(result.raceTime);

      resultItem.innerHTML = `
        <div><strong>Runner ${result.runnerNumber}</strong></div>
        <div>${raceTimeFormatted}</div>
      `;

      this.elements.resultsList.appendChild(resultItem);
    });

    // If there are more than 10 results, show a message
    if (sortedResults.length > 10) {
      const moreResults = document.createElement('div');
      moreResults.className = 'more-results';
      moreResults.textContent = `... and ${sortedResults.length - 10} more`;
      this.elements.resultsList.appendChild(moreResults);
    }
  }

  /**
   * End the race
   */
  async endRace() {
    if (!this.currentRaceId) {
      showNotification('No race selected', 3000);
      return;
    }

    try {
      // Check if we're online first
      if (!window.offlineStorage.isDeviceOnline()) {
        // If offline, just stop the timer locally
        this.raceTimer.stop();
        showNotification('Race timer stopped', 3000);
        return;
      }

      // Stop the timer
      this.raceTimer.stop();

      const response = await fetch(`/api/races/${this.currentRaceId}/end`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to end race');
      }

      // Update current race data
      const updatedRace = await response.json();
      this.currentRace = {
        ...this.currentRace,
        status: updatedRace.status,
      };

      // Update button states
      this.buttons.startTimer.disabled = true;
      this.buttons.recordFinish.disabled = true;
      this.buttons.endRace.disabled = true;

      showNotification('Race ended', 3000);

      // Ask to upload results if there are any and we're online
      if (this.results.length > 0 && window.offlineStorage.isDeviceOnline()) {
        if (confirm('Would you like to upload the race results now?')) {
          this.uploadResults();
        }
      }
    } catch (error) {
      console.error('End race error:', error);
      showNotification('Failed to end race', 3000);
    }
  }

  /**
   * Upload race results to the server
   */
  async uploadResults() {
    if (!this.currentRaceId) {
      showNotification('No race selected', 3000);
      return;
    }

    if (this.results.length === 0) {
      showNotification('No results to upload', 3000);
      return;
    }

    try {
      // Check if we're online first
      if (!window.offlineStorage.isDeviceOnline()) {
        showNotification('Results saved offline and will sync when online', 3000);
        return;
      }

      const response = await fetch(`/api/races/${this.currentRaceId}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          results: this.results.map(result => ({
            runnerNumber: result.runnerNumber,
            finishTime: result.finishTime,
          })),
          deviceId: window.offlineStorage.getDeviceId(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload results');
      }

      // Clear local results
      this.results = [];
      this.updateResultsList();
      window.offlineStorage.clearResults();

      // Update button states
      this.buttons.uploadResults.disabled = true;
      this.buttons.clearResults.disabled = true;

      showNotification('Results uploaded successfully', 3000);
    } catch (error) {
      console.error('Upload results error:', error);
      showNotification('Failed to upload results', 3000);
    }
  }

  /**
   * Clear recorded results
   */
  clearResults() {
    if (this.results.length === 0) {
      return;
    }

    if (confirm('Are you sure you want to clear all recorded results?')) {
      this.results = [];
      this.updateResultsList();
      window.offlineStorage.clearResults();

      // Update button states
      this.buttons.uploadResults.disabled = true;
      this.buttons.clearResults.disabled = true;

      showNotification('Results cleared', 3000);
    }
  }

  /**
   * Show a confirmation dialog for race deletion
   * @param {number} raceId - The ID of the race to delete
   * @param {string} raceName - The name of the race
   */
  confirmDeleteRace(raceId, raceName) {
    // Create a modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Create the confirmation modal
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <h3>Delete Race</h3>
      <p>Are you sure you want to delete the race "${raceName}"?</p>
      <p class="warning">This will permanently delete all race data and results. This action cannot be undone.</p>
      <div class="modal-buttons">
        <button id="cancel-delete" class="secondary-button">Cancel</button>
        <button id="confirm-delete" class="danger-button">Delete Race</button>
      </div>
    `;

    // Add the modal to the overlay
    overlay.appendChild(modal);

    // Add the overlay to the document
    document.body.appendChild(overlay);

    // Add event listeners
    document.querySelector('#cancel-delete').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    document.querySelector('#confirm-delete').addEventListener('click', () => {
      this.deleteRace(raceId);
      document.body.removeChild(overlay);
    });
  }

  /**
   * Delete a race
   * @param {number} raceId - The ID of the race to delete
   */
  async deleteRace(raceId) {
    try {
      // Check if we're online first
      if (!window.offlineStorage.isDeviceOnline()) {
        showNotification('Cannot delete race while offline', 3000);
        return;
      }

      const response = await fetch(`/api/races/${raceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete race');
      }

      // Reload the races list
      showNotification('Race deleted successfully', 3000);
      this.loadRaces();
    } catch (error) {
      console.error('Delete race error:', error);
      showNotification('Failed to delete race', 3000);
    }
  }

  /**
   * Load race results
   * @param {number} raceId - The ID of the race to load results for
   */
  async loadRaceResults(raceId) {
    try {
      // Check if we're online first
      if (!window.offlineStorage.isDeviceOnline()) {
        showNotification('Cannot load results while offline', 3000);
        return;
      }

      // Fetch race details
      const raceResponse = await fetch(`/api/races/${raceId}`);

      if (!raceResponse.ok) {
        throw new Error('Failed to load race details');
      }

      const race = await raceResponse.json();
      this.currentRaceId = raceId; // Store the current race ID

      // Fetch race results
      const resultsResponse = await fetch(`/api/races/${raceId}/results`);

      if (!resultsResponse.ok) {
        throw new Error('Failed to load race results');
      }

      const results = await resultsResponse.json();

      // Update the race name display
      this.elements.resultsRaceName.textContent = race.name;

      // Clear the results container
      this.elements.resultsTableContainer.innerHTML = '';

      if (results.length === 0) {
        this.elements.resultsTableContainer.innerHTML = '<p>No results available for this race</p>';
      } else {
        // Sort results by race time (ascending)
        const sortedResults = [...results].sort((a, b) => a.raceTime - b.raceTime);

        // Create pagination controls and table container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'results-container';

        // Add total runners count
        const totalRunners = document.createElement('div');
        totalRunners.className = 'total-runners';
        totalRunners.textContent = `Total Runners: ${sortedResults.length}`;
        resultsContainer.appendChild(totalRunners);

        // Create the results table with pagination
        this.createPaginatedResultsTable(resultsContainer, sortedResults);

        this.elements.resultsTableContainer.appendChild(resultsContainer);
      }

      // Add delete button if race is completed
      if (race.status === 'completed') {
        const deleteButtonContainer = document.createElement('div');
        deleteButtonContainer.className = 'delete-button-container';

        const deleteButton = document.createElement('button');
        deleteButton.className = 'danger-button';
        deleteButton.textContent = 'Delete Race';
        deleteButton.addEventListener('click', () => {
          this.confirmDeleteRace(raceId, race.name);
        });

        deleteButtonContainer.appendChild(deleteButton);
        this.elements.resultsTableContainer.appendChild(deleteButtonContainer);
      }

      // Show the results screen
      this.showScreen('results-screen');
    } catch (error) {
      console.error('Load race results error:', error);
      showNotification('Failed to load race results', 3000);
    }
  }

  /**
   * Create a paginated results table
   * @param {HTMLElement} container - The container to append the table to
   * @param {Array} results - The results to display
   * @param {number} itemsPerPage - Number of items per page (default: 25)
   */
  createPaginatedResultsTable(container, results, itemsPerPage = 25) {
    // Store the data and pagination state
    const paginationState = {
      results,
      currentPage: 1,
      itemsPerPage,
      totalPages: Math.ceil(results.length / itemsPerPage),
    };

    // Create the table element
    const table = document.createElement('table');
    table.className = 'results-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Position</th>
          <th>Runner</th>
          <th>Race Time</th>
          <th>Finish Time</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    container.appendChild(table);

    // Create pagination controls
    const paginationControls = document.createElement('div');
    paginationControls.className = 'pagination-controls';

    // Add search functionality
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
      <label for="runner-search">Find Runner:</label>
      <input type="number" id="runner-search" placeholder="Runner Number" min="1">
      <button id="search-button" class="secondary-button">Search</button>
    `;

    // Create pagination navigation
    const paginationNav = document.createElement('div');
    paginationNav.className = 'pagination-nav';
    paginationNav.innerHTML = `
      <button id="prev-page" class="secondary-button" ${paginationState.currentPage === 1 ? 'disabled' : ''}>Previous</button>
      <span id="page-indicator">Page ${paginationState.currentPage} of ${paginationState.totalPages}</span>
      <button id="next-page" class="secondary-button" ${paginationState.currentPage === paginationState.totalPages ? 'disabled' : ''}>Next</button>
    `;

    paginationControls.appendChild(searchContainer);
    paginationControls.appendChild(paginationNav);
    container.appendChild(paginationControls);

    // Function to render the current page
    const renderPage = (state) => {
      const tbody = table.querySelector('tbody');
      tbody.innerHTML = '';

      const startIndex = (state.currentPage - 1) * state.itemsPerPage;
      const endIndex = Math.min(startIndex + state.itemsPerPage, state.results.length);

      for (let i = startIndex; i < endIndex; i++) {
        const result = state.results[i];
        const position = i + 1;
        const raceTimeFormatted = this.formatTimeDisplay(result.raceTime);
        const finishTimeFormatted = new Date(result.finishTime).toLocaleTimeString();

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${position}</td>
          <td>${result.runnerNumber}</td>
          <td>${raceTimeFormatted}</td>
          <td>${finishTimeFormatted}</td>
        `;

        tbody.appendChild(row);
      }

      // Update pagination controls
      document.querySelector('#page-indicator').textContent = `Page ${state.currentPage} of ${state.totalPages}`;
      document.querySelector('#prev-page').disabled = state.currentPage === 1;
      document.querySelector('#next-page').disabled = state.currentPage === state.totalPages;
    };

    // Initial render
    renderPage(paginationState);

    // Add event listeners for pagination
    document.querySelector('#prev-page').addEventListener('click', () => {
      if (paginationState.currentPage > 1) {
        paginationState.currentPage--;
        renderPage(paginationState);
      }
    });

    document.querySelector('#next-page').addEventListener('click', () => {
      if (paginationState.currentPage < paginationState.totalPages) {
        paginationState.currentPage++;
        renderPage(paginationState);
      }
    });

    // Add event listener for search
    document.querySelector('#search-button').addEventListener('click', () => {
      const searchInput = document.querySelector('#runner-search');
      const runnerNumber = parseInt(searchInput.value);

      if (!isNaN(runnerNumber) && runnerNumber > 0) {
        // Find the runner in the results
        const runnerIndex = results.findIndex(result => result.runnerNumber === runnerNumber);

        if (runnerIndex >= 0) {
          // Calculate the page the runner is on
          const runnerPage = Math.floor(runnerIndex / paginationState.itemsPerPage) + 1;
          paginationState.currentPage = runnerPage;
          renderPage(paginationState);

          // Highlight the row
          setTimeout(() => {
            const tbody = table.querySelector('tbody');
            const rows = tbody.querySelectorAll('tr');
            const rowIndex = runnerIndex % paginationState.itemsPerPage;

            if (rows[rowIndex]) {
              rows[rowIndex].classList.add('highlighted');
              setTimeout(() => {
                rows[rowIndex].classList.remove('highlighted');
              }, 3000);
            }
          }, 100);
        } else {
          showNotification(`Runner ${runnerNumber} not found`, 3000);
        }
      } else {
        showNotification('Please enter a valid runner number', 3000);
      }
    });
  }

  /**
   * Format time in milliseconds to a readable format
   * @param {number} timeInMs - Time in milliseconds
   * @returns {string} Formatted time string
   */
  formatTimeDisplay(timeInMs) {
    if (timeInMs === null || timeInMs === undefined) return 'N/A';

    const totalSeconds = Math.floor(timeInMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
