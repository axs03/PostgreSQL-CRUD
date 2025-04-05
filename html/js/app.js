'use strict';

// Base API URL for all requests
const BASE_API_URL = 'http://localhost:3000';

// Initialize our app namespace
const app = {};

// Show a status message to the user
app.showStatus = function(message, type = 'info') {
    const statusElement = document.getElementById('status-message');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = 'status-message ' + type;
    
    // Clear success and info messages after a delay
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            statusElement.style.opacity = 0;
        }, 3000);
    }
};

// Show a loading indicator in a table
app.showTableLoading = function(tableBodyId) {
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) {
        console.error('Table body not found:', tableBodyId);
        return;
    }
    
    const table = tableBody.closest('table');
    if (!table) {
        console.error('Table not found for body:', tableBodyId);
        return;
    }
    
    const headerRow = table.querySelector('thead tr');
    const columnCount = headerRow ? headerRow.children.length : 4;
    
    tableBody.innerHTML = `
        <tr class="loading-row">
            <td colspan="${columnCount}">
                <span class="loading-indicator">Loading data...</span>
            </td>
        </tr>
    `;
};

// Get data from the API with error handling
app.fetchData = function(endpoint) {
    app.showStatus('Loading data...', 'loading');
    
    const url = BASE_API_URL + endpoint;
    console.log('Fetching from:', url);
    
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                console.error('Response not OK:', response.status, response.statusText);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data received:', Array.isArray(data) ? `${data.length} items` : 'Object');
            app.showStatus('Data loaded successfully!', 'success');
            return data;
        })
        .catch(error => {
            console.error('Fetch error details:', error);
            app.showStatus(`Error loading data: ${error.message}`, 'error');
            return [];
        });
};

// Generic API request function for CRUD operations
app.apiRequest = function(endpoint, method, data = null) {
    const url = BASE_API_URL + endpoint;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    
    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    console.log(`${method} request to:`, url);
    if (data) console.log('With data:', data);
    
    return fetch(url, options)
        .then(response => {
            if (!response.ok) {
                console.error('API Error:', response.status, response.statusText);
                return response.text().then(text => {
                    throw new Error(`API Error (${response.status}): ${text || response.statusText}`);
                });
            }
            
            // For PATCH, POST, PUT, DELETE - we expect empty responses in many cases
            if (method === 'PATCH' || method === 'POST' || method === 'PUT' || method === 'DELETE') {
                // First check if we can determine there's no content or it's not JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.log(`${method} successful with non-JSON response`);
                    return { success: true };
                }
                
                // Clone the response and check if it's empty by reading it as text
                return response.clone().text().then(text => {
                    if (!text || text.trim() === '') {
                        console.log(`${method} successful with empty response body`);
                        return { success: true };
                    }
                    
                    // If we have text content that should be JSON, parse it
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        console.log(`${method} response not valid JSON, returning success object`);
                        return { success: true };
                    }
                });
            }
            
            // For GET and other methods, we expect JSON content
            return response.json();
        })
        .then(data => {
            app.showStatus(`Operation completed successfully`, 'success');
            return data;
        })
        .catch(error => {
            app.showStatus(`Error: ${error.message}`, 'error');
            throw error;
        });
};

// Change active tab and show the corresponding section
app.showTable = function(tableName) {
    console.log('Showing table:', tableName);
    
    // Hide all table sections
    document.querySelectorAll('.section-container').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show the selected table section
    const sectionElement = document.getElementById(tableName + '-section');
    if (sectionElement) {
        sectionElement.classList.remove('hidden');
    } else {
        app.showStatus(`Error: Section "${tableName}" not found!`, 'error');
        return;
    }
    
    // Update menu selection
    document.querySelectorAll('.pure-menu-item').forEach(item => {
        item.classList.remove('pure-menu-selected');
    });
    
    const tabElement = document.getElementById(tableName + '-tab');
    if (tabElement) {
        tabElement.classList.add('pure-menu-selected');
    }
    
    // Load data automatically when tab is selected
    switch(tableName) {
        case 'player':
            app.loadAllPlayers();
            break;
        case 'team':
            app.loadAllTeams();
            break;
        case 'coach':
            app.loadAllCoaches();
            break;
        case 'parent':
            app.loadAllParents();
            break;
        case 'player_parent':
            app.loadAllPlayerParents();
            break;
    }
};

// PLAYER TABLE FUNCTIONS

// Load all players
app.loadAllPlayers = function() {
    app.showTableLoading('player-table-body');
    
    app.fetchData('/player')
        .then(data => {
            app.displayPlayers(data);
        });
};

// Search players by name
app.searchPlayers = function(name) {
    if (!name || name.trim() === '') {
        app.loadAllPlayers();
        return;
    }
    
    app.showTableLoading('player-table-body');
    
    // Fix the query format for PostgREST
    // PostgREST syntax: ?column=ilike.*pattern*
    const pattern = encodeURIComponent("*" + name + "*");
    const queryURL = `/player?first_name=ilike.${pattern}`;
    
    console.log('Search URL:', queryURL);
    
    app.fetchData(queryURL)
        .then(data => {
            app.displayPlayers(data);
        });
};

// Display players in table and card view
app.displayPlayers = function(players) {
    const tableBody = document.getElementById('player-table-body');
    const cardContainer = document.getElementById('player-card-container');
    
    if (!tableBody || !cardContainer) {
        console.error('Player table body or card container not found');
        return;
    }
    
    // Handle table view
    let rowsHTML = '';
    
    if (players && players.length > 0) {
        players.forEach(player => {
            rowsHTML += `
                <tr data-id="${player.player_id}">
                    <td>${player.first_name || ''}</td>
                    <td>${player.last_name || ''}</td>
                    <td>${player.age || ''}</td>
                    <td>${player.team_id || ''}</td>
                    <td class="actions">
                        <button class="pure-button edit-btn" onclick="app.editPlayer(${player.player_id})">Edit</button>
                        <button class="pure-button delete-btn" onclick="app.deletePlayer(${player.player_id})">Delete</button>
                    </td>
                </tr>
            `;
        });
    } else {
        rowsHTML = '<tr><td colspan="5">No players found</td></tr>';
    }
    
    tableBody.innerHTML = rowsHTML;
    
    // Handle card view
    let cardsHTML = '';
    
    if (players && players.length > 0) {
        players.forEach(player => {
            cardsHTML += `
                <div class="data-card" data-id="${player.player_id}">
                    <div class="data-card-header">
                        ${player.first_name} ${player.last_name}
                    </div>
                    <div class="data-card-body">
                        <div class="data-card-field">
                            <span class="data-card-label">Age</span>
                            <span class="data-card-value">${player.age || ''}</span>
                        </div>
                        <div class="data-card-field">
                            <span class="data-card-label">Team ID</span>
                            <span class="data-card-value">${player.team_id || ''}</span>
                        </div>
                    </div>
                    <div class="data-card-actions">
                        <button class="pure-button edit-btn" onclick="app.editPlayer(${player.player_id})">Edit</button>
                        <button class="pure-button delete-btn" onclick="app.deletePlayer(${player.player_id})">Delete</button>
                    </div>
                </div>
            `;
        });
    } else {
        cardsHTML = `
            <div class="empty-grid">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <p>No players found</p>
            </div>
        `;
    }
    
    cardContainer.innerHTML = cardsHTML;
};

// Create a new player
app.createPlayer = function(playerData) {
    return app.apiRequest('/player', 'POST', playerData)
        .then(() => {
            app.loadAllPlayers();
            app.hidePlayerForm();
        })
        .catch(error => {
            console.error('Error creating player:', error);
        });
};

// Update an existing player
app.updatePlayer = function(playerId, playerData) {
    return app.apiRequest(`/player?player_id=eq.${playerId}`, 'PATCH', playerData)
        .then(() => {
            app.loadAllPlayers();
            app.hidePlayerForm();
        })
        .catch(error => {
            console.error('Error updating player:', error);
        });
};

// Delete a player
app.deletePlayer = function(playerId) {
    if (confirm('Are you sure you want to delete this player?')) {
        app.apiRequest(`/player?player_id=eq.${playerId}`, 'DELETE')
            .then(() => {
                app.loadAllPlayers();
            })
            .catch(error => {
                console.error('Error deleting player:', error);
            });
    }
};

// Show form to edit player
app.editPlayer = function(playerId) {
    app.fetchData(`/player?player_id=eq.${playerId}`)
        .then(data => {
            if (data && data.length > 0) {
                const player = data[0];
                
                // Populate form with player data
                document.getElementById('player-form-id').value = player.player_id;
                document.getElementById('player-form-first-name').value = player.first_name || '';
                document.getElementById('player-form-last-name').value = player.last_name || '';
                document.getElementById('player-form-age').value = player.age || '';
                document.getElementById('player-form-team-id').value = player.team_id || '';
                
                // Show form for editing
                document.getElementById('player-form-title').textContent = 'Edit Player';
                app.showPlayerForm();
            }
        });
};

// Show form for new player
app.showNewPlayerForm = function() {
    // Reset form
    document.getElementById('player-form').reset();
    document.getElementById('player-form-id').value = '';
    document.getElementById('player-form-title').textContent = 'Add New Player';
    
    // Show form
    app.showPlayerForm();
};

// Show player form
app.showPlayerForm = function() {
    document.getElementById('player-form-container').classList.remove('hidden');
};

// Hide player form
app.hidePlayerForm = function() {
    document.getElementById('player-form-container').classList.add('hidden');
};

// Handle player form submission
app.handlePlayerFormSubmit = function(event) {
    event.preventDefault();
    
    const playerId = document.getElementById('player-form-id').value;
    const playerData = {
        first_name: document.getElementById('player-form-first-name').value,
        last_name: document.getElementById('player-form-last-name').value,
        age: parseInt(document.getElementById('player-form-age').value),
        team_id: parseInt(document.getElementById('player-form-team-id').value)
    };
    
    if (playerId) {
        // Update existing player
        app.updatePlayer(playerId, playerData);
    } else {
        // Create new player
        app.createPlayer(playerData);
    }
};

// TEAM TABLE FUNCTIONS

// Load all teams
app.loadAllTeams = function() {
    app.showTableLoading('team-table-body');
    
    app.fetchData('/team')
        .then(data => {
            app.displayTeams(data);
        });
};

// Display teams in table and card view
app.displayTeams = function(teams) {
    const tableBody = document.getElementById('team-table-body');
    const cardContainer = document.getElementById('team-card-container');
    
    if (!tableBody || !cardContainer) return;
    
    // Handle table view
    let rowsHTML = '';
    
    if (teams && teams.length > 0) {
        teams.forEach(team => {
            rowsHTML += `
                <tr data-id="${team.team_id}">
                    <td>${team.team_id || ''}</td>
                    <td>${team.team_name || ''}</td>
                    <td>${(team.team_colors && Array.isArray(team.team_colors)) ? team.team_colors.join(', ') : ''}</td>
                    <td class="actions">
                        <button class="pure-button edit-btn" onclick="app.editTeam(${team.team_id})">Edit</button>
                        <button class="pure-button delete-btn" onclick="app.deleteTeam(${team.team_id})">Delete</button>
                    </td>
                </tr>
            `;
        });
    } else {
        rowsHTML = '<tr><td colspan="4">No teams found</td></tr>';
    }
    
    tableBody.innerHTML = rowsHTML;
    
    // Handle card view
    let cardsHTML = '';
    
    if (teams && teams.length > 0) {
        teams.forEach(team => {
            const colors = (team.team_colors && Array.isArray(team.team_colors)) 
                ? team.team_colors.join(', ') 
                : '';
            
            cardsHTML += `
                <div class="data-card" data-id="${team.team_id}">
                    <div class="data-card-header">
                        ${team.team_name || 'Team'}
                    </div>
                    <div class="data-card-body">
                        <div class="data-card-field">
                            <span class="data-card-label">Team ID</span>
                            <span class="data-card-value">${team.team_id || ''}</span>
                        </div>
                        <div class="data-card-field">
                            <span class="data-card-label">Team Colors</span>
                            <span class="data-card-value">${colors}</span>
                        </div>
                    </div>
                    <div class="data-card-actions">
                        <button class="pure-button edit-btn" onclick="app.editTeam(${team.team_id})">Edit</button>
                        <button class="pure-button delete-btn" onclick="app.deleteTeam(${team.team_id})">Delete</button>
                    </div>
                </div>
            `;
        });
    } else {
        cardsHTML = `
            <div class="empty-grid">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <p>No teams found</p>
            </div>
        `;
    }
    
    cardContainer.innerHTML = cardsHTML;
};

// Create a new team
app.createTeam = function(teamData) {
    // Convert comma-separated colors to array
    if (typeof teamData.team_colors === 'string') {
        teamData.team_colors = teamData.team_colors.split(',').map(color => color.trim());
    }
    
    return app.apiRequest('/team', 'POST', teamData)
        .then(() => {
            app.loadAllTeams();
            app.hideTeamForm();
        })
        .catch(error => {
            console.error('Error creating team:', error);
        });
};

// Update an existing team
app.updateTeam = function(teamId, teamData) {
    // Convert comma-separated colors to array
    if (typeof teamData.team_colors === 'string') {
        teamData.team_colors = teamData.team_colors.split(',').map(color => color.trim());
    }
    
    return app.apiRequest(`/team?team_id=eq.${teamId}`, 'PATCH', teamData)
        .then(() => {
            app.loadAllTeams();
            app.hideTeamForm();
        })
        .catch(error => {
            console.error('Error updating team:', error);
        });
};

// Delete a team
app.deleteTeam = function(teamId) {
    if (confirm('Are you sure you want to delete this team?')) {
        app.apiRequest(`/team?team_id=eq.${teamId}`, 'DELETE')
            .then(() => {
                app.loadAllTeams();
            })
            .catch(error => {
                console.error('Error deleting team:', error);
            });
    }
};

// Show form to edit team
app.editTeam = function(teamId) {
    app.fetchData(`/team?team_id=eq.${teamId}`)
        .then(data => {
            if (data && data.length > 0) {
                const team = data[0];
                
                // Populate form with team data
                document.getElementById('team-form-id').value = team.team_id;
                document.getElementById('team-form-name').value = team.team_name || '';
                
                // Convert array to comma-separated string
                const colorsStr = (team.team_colors && Array.isArray(team.team_colors)) 
                    ? team.team_colors.join(', ') 
                    : '';
                document.getElementById('team-form-colors').value = colorsStr;
                
                // Show form for editing
                document.getElementById('team-form-title').textContent = 'Edit Team';
                app.showTeamForm();
            }
        });
};

// Show form for new team
app.showNewTeamForm = function() {
    // Reset form
    document.getElementById('team-form').reset();
    document.getElementById('team-form-id').value = '';
    document.getElementById('team-form-title').textContent = 'Add New Team';
    
    // Show form
    app.showTeamForm();
};

// Show team form
app.showTeamForm = function() {
    document.getElementById('team-form-container').classList.remove('hidden');
};

// Hide team form
app.hideTeamForm = function() {
    document.getElementById('team-form-container').classList.add('hidden');
};

// Handle team form submission
app.handleTeamFormSubmit = function(event) {
    event.preventDefault();
    
    const teamId = document.getElementById('team-form-id').value;
    const teamData = {
        team_name: document.getElementById('team-form-name').value,
        team_colors: document.getElementById('team-form-colors').value
    };
    
    if (teamId) {
        // Update existing team
        app.updateTeam(teamId, teamData);
    } else {
        // Create new team
        app.createTeam(teamData);
    }
};

// COACH TABLE FUNCTIONS

// Load all coaches
app.loadAllCoaches = function() {
    app.showTableLoading('coach-table-body');
    
    app.fetchData('/coach')
        .then(data => {
            app.displayCoaches(data);
        });
};

// Display coaches in table and card view
app.displayCoaches = function(coaches) {
    const tableBody = document.getElementById('coach-table-body');
    const cardContainer = document.getElementById('coach-card-container');
    
    if (!tableBody || !cardContainer) return;
    
    // Handle table view
    let rowsHTML = '';
    
    if (coaches && coaches.length > 0) {
        coaches.forEach(coach => {
            rowsHTML += `
                <tr>
                    <td>${coach.coach_id || ''}</td>
                    <td>${coach.first_name || ''}</td>
                    <td>${coach.last_name || ''}</td>
                    <td>${coach.home_phone || ''}</td>
                    <td>${coach.team_id || ''}</td>
                </tr>
            `;
        });
    } else {
        rowsHTML = '<tr><td colspan="5">No coaches found</td></tr>';
    }
    
    tableBody.innerHTML = rowsHTML;
    
    // Handle card view
    let cardsHTML = '';
    
    if (coaches && coaches.length > 0) {
        coaches.forEach(coach => {
            cardsHTML += `
                <div class="data-card" data-id="${coach.coach_id}">
                    <div class="data-card-header">
                        ${coach.first_name} ${coach.last_name}
                    </div>
                    <div class="data-card-body">
                        <div class="data-card-field">
                            <span class="data-card-label">Coach ID</span>
                            <span class="data-card-value">${coach.coach_id || ''}</span>
                        </div>
                        <div class="data-card-field">
                            <span class="data-card-label">Phone</span>
                            <span class="data-card-value">${coach.home_phone || ''}</span>
                        </div>
                        <div class="data-card-field">
                            <span class="data-card-label">Team ID</span>
                            <span class="data-card-value">${coach.team_id || ''}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        cardsHTML = `
            <div class="empty-grid">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <p>No coaches found</p>
            </div>
        `;
    }
    
    cardContainer.innerHTML = cardsHTML;
};

// PARENT TABLE FUNCTIONS

// Load all parents
app.loadAllParents = function() {
    app.showTableLoading('parent-table-body');
    
    app.fetchData('/parent')
        .then(data => {
            app.displayParents(data);
        });
};

// Display parents in table and card view
app.displayParents = function(parents) {
    const tableBody = document.getElementById('parent-table-body');
    const cardContainer = document.getElementById('parent-card-container');
    
    if (!tableBody || !cardContainer) return;
    
    // Handle table view
    let rowsHTML = '';
    
    if (parents && parents.length > 0) {
        parents.forEach(parent => {
            const address = [
                parent.street, 
                parent.city, 
                parent.state, 
                parent.zip_code
            ].filter(Boolean).join(', ');
            
            rowsHTML += `
                <tr>
                    <td>${parent.parent_id || ''}</td>
                    <td>${parent.first_name || ''}</td>
                    <td>${parent.last_name || ''}</td>
                    <td>${parent.home_phone || ''}</td>
                    <td>${address || ''}</td>
                </tr>
            `;
        });
    } else {
        rowsHTML = '<tr><td colspan="5">No parents found</td></tr>';
    }
    
    tableBody.innerHTML = rowsHTML;
    
    // Handle card view
    let cardsHTML = '';
    
    if (parents && parents.length > 0) {
        parents.forEach(parent => {
            const address = [
                parent.street, 
                parent.city, 
                parent.state, 
                parent.zip_code
            ].filter(Boolean).join(', ');
            
            cardsHTML += `
                <div class="data-card" data-id="${parent.parent_id}">
                    <div class="data-card-header">
                        ${parent.first_name} ${parent.last_name}
                    </div>
                    <div class="data-card-body">
                        <div class="data-card-field">
                            <span class="data-card-label">Parent ID</span>
                            <span class="data-card-value">${parent.parent_id || ''}</span>
                        </div>
                        <div class="data-card-field">
                            <span class="data-card-label">Phone</span>
                            <span class="data-card-value">${parent.home_phone || ''}</span>
                        </div>
                        <div class="data-card-field">
                            <span class="data-card-label">Address</span>
                            <span class="data-card-value">${address || ''}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        cardsHTML = `
            <div class="empty-grid">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <p>No parents found</p>
            </div>
        `;
    }
    
    cardContainer.innerHTML = cardsHTML;
};

// PLAYER-PARENT TABLE FUNCTIONS

// Load all player-parent relationships
app.loadAllPlayerParents = function() {
    app.showTableLoading('player-parent-table-body');
    
    app.fetchData('/player_parent')
        .then(data => {
            app.displayPlayerParents(data);
        });
};

// Display player-parent relationships in table and card view
app.displayPlayerParents = function(relationships) {
    const tableBody = document.getElementById('player-parent-table-body');
    const cardContainer = document.getElementById('player-parent-card-container');
    
    if (!tableBody || !cardContainer) return;
    
    // Handle table view
    let rowsHTML = '';
    
    if (relationships && relationships.length > 0) {
        relationships.forEach(relation => {
            rowsHTML += `
                <tr>
                    <td>${relation.player_id || ''}</td>
                    <td>${relation.parent_id || ''}</td>
                    <td>${relation.relationship_type || ''}</td>
                </tr>
            `;
        });
    } else {
        rowsHTML = '<tr><td colspan="3">No relationships found</td></tr>';
    }
    
    tableBody.innerHTML = rowsHTML;
    
    // Handle card view
    let cardsHTML = '';
    
    if (relationships && relationships.length > 0) {
        relationships.forEach(relation => {
            cardsHTML += `
                <div class="data-card">
                    <div class="data-card-header">
                        ${relation.relationship_type || 'Relationship'}
                    </div>
                    <div class="data-card-body">
                        <div class="data-card-field">
                            <span class="data-card-label">Player ID</span>
                            <span class="data-card-value">${relation.player_id || ''}</span>
                        </div>
                        <div class="data-card-field">
                            <span class="data-card-label">Parent ID</span>
                            <span class="data-card-value">${relation.parent_id || ''}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        cardsHTML = `
            <div class="empty-grid">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <p>No relationships found</p>
            </div>
        `;
    }
    
    cardContainer.innerHTML = cardsHTML;
};

// Set up view toggle for a section
app.setupViewToggle = function(sectionName) {
    const tableViewBtn = document.getElementById(`${sectionName}-table-view`);
    const cardViewBtn = document.getElementById(`${sectionName}-card-view`);
    const tableContainer = document.getElementById(`${sectionName}-table-container`);
    const cardContainer = document.getElementById(`${sectionName}-card-container`);
    
    if (!tableViewBtn || !cardViewBtn || !tableContainer || !cardContainer) return;
    
    tableViewBtn.addEventListener('click', function() {
        // Update buttons
        tableViewBtn.classList.add('active');
        cardViewBtn.classList.remove('active');
        
        // Update view
        tableContainer.classList.remove('hidden');
        cardContainer.classList.add('hidden');
    });
    
    cardViewBtn.addEventListener('click', function() {
        // Update buttons
        cardViewBtn.classList.add('active');
        tableViewBtn.classList.remove('active');
        
        // Update view
        cardContainer.classList.remove('hidden');
        tableContainer.classList.add('hidden');
    });
};

// Set up event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    console.log('API Base URL:', BASE_API_URL);
    
    // Tab navigation
    document.querySelectorAll('.pure-menu-link').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const tableName = this.getAttribute('data-table');
            if (tableName) {
                app.showTable(tableName);
            }
        });
    });
    
    // Set up view toggles for each section
    app.setupViewToggle('player');
    app.setupViewToggle('team');
    app.setupViewToggle('coach');
    app.setupViewToggle('parent');
    app.setupViewToggle('relationship');
    
    // Player search form
    const playerSearchForm = document.getElementById('player-search-form');
    if (playerSearchForm) {
        playerSearchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const searchInput = document.getElementById('player-input');
            app.searchPlayers(searchInput.value);
        });
    }
    
    // Show All Players button
    const loadAllPlayersBtn = document.getElementById('load-all-players');
    if (loadAllPlayersBtn) {
        loadAllPlayersBtn.addEventListener('click', function(event) {
            event.preventDefault();
            app.loadAllPlayers();
        });
    }
    
    // Show All Teams button
    const loadAllTeamsBtn = document.getElementById('load-all-teams');
    if (loadAllTeamsBtn) {
        loadAllTeamsBtn.addEventListener('click', function(event) {
            event.preventDefault();
            app.loadAllTeams();
        });
    }
    
    // Show All Coaches button
    const loadAllCoachesBtn = document.getElementById('load-all-coaches');
    if (loadAllCoachesBtn) {
        loadAllCoachesBtn.addEventListener('click', function(event) {
            event.preventDefault();
            app.loadAllCoaches();
        });
    }
    
    // Show All Parents button
    const loadAllParentsBtn = document.getElementById('load-all-parents');
    if (loadAllParentsBtn) {
        loadAllParentsBtn.addEventListener('click', function(event) {
            event.preventDefault();
            app.loadAllParents();
        });
    }
    
    // Show All Player-Parent Relationships button
    const loadAllPlayerParentsBtn = document.getElementById('load-all-player-parents');
    if (loadAllPlayerParentsBtn) {
        loadAllPlayerParentsBtn.addEventListener('click', function(event) {
            event.preventDefault();
            app.loadAllPlayerParents();
        });
    }
    
    // CRUD form close buttons
    document.querySelectorAll('.form-close-btn').forEach(btn => {
        btn.addEventListener('click', function(event) {
            event.preventDefault();
            const formContainer = this.closest('.form-container');
            if (formContainer) {
                formContainer.classList.add('hidden');
            }
        });
    });
    
    // Player form
    const playerForm = document.getElementById('player-form');
    if (playerForm) {
        playerForm.addEventListener('submit', app.handlePlayerFormSubmit);
        document.getElementById('new-player-btn').addEventListener('click', app.showNewPlayerForm);
        document.getElementById('player-form-cancel').addEventListener('click', app.hidePlayerForm);
    }
    
    // Team form
    const teamForm = document.getElementById('team-form');
    if (teamForm) {
        teamForm.addEventListener('submit', app.handleTeamFormSubmit);
        document.getElementById('new-team-btn').addEventListener('click', app.showNewTeamForm);
        document.getElementById('team-form-cancel').addEventListener('click', app.hideTeamForm);
    }
    
    // Load the player table by default
    app.showTable('player');
    console.log('Initial setup complete');
});