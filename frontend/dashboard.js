// Dashboard functionality
const API_BASE = 'http://localhost:3000/api';
let currentUser = null;

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = 'index.html';
        return false;
    }
    
    currentUser = JSON.parse(user);
    return true;
}

// API helper function
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, mergedOptions);
        
        if (response.status === 401) {
            logout();
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        return null;
    }
}

// Initialize dashboard
async function initDashboard() {
    if (!checkAuth()) return;
    
    // Update user name
    document.getElementById('userName').textContent = currentUser.name || 'Musician';
    
    // Load user stats
    await loadUserStats();
    
    // Load trending songs by default
    await loadTrendingSongs();
}

// Load user statistics
async function loadUserStats() {
    const stats = await apiCall(`/users/${currentUser.id}/stats`);
    
    if (stats) {
        document.getElementById('songsCount').textContent = stats.songsCount || 0;
        document.getElementById('collaborationsCount').textContent = stats.collaborationsCount || 0;
        document.getElementById('votesCount').textContent = stats.votesReceived || 0;
    }
}

// Tab functionality
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load content based on tab
    switch(tabName) {
        case 'trending':
            loadTrendingSongs();
            break;
        case 'my-songs':
            loadMySongs();
            break;
        case 'collaborations':
            loadMyCollaborations();
            break;
    }
}

// Load trending songs
async function loadTrendingSongs() {
    const songs = await apiCall('/songs/trending');
    const container = document.getElementById('trendingSongs');
    
    if (songs && songs.length > 0) {
        container.innerHTML = songs.map(song => createSongCard(song)).join('');
    } else {
        container.innerHTML = '<p>No trending songs yet. Be the first to upload!</p>';
    }
}

// Load user's songs
async function loadMySongs() {
    const songs = await apiCall(`/users/${currentUser.id}/songs`);
    const container = document.getElementById('mySongs');
    
    if (songs && songs.length > 0) {
        container.innerHTML = songs.map(song => createSongCard(song, true)).join('');
    } else {
        container.innerHTML = '<p>You haven\'t uploaded any songs yet. <a href="#" onclick="openUploadModal()">Upload your first song!</a></p>';
    }
}

// Load user's collaborations
async function loadMyCollaborations() {
    const collaborations = await apiCall(`/users/${currentUser.id}/collaborations`);
    const container = document.getElementById('recentCollaborations');
    
    if (collaborations && collaborations.length > 0) {
        container.innerHTML = collaborations.map(collab => createCollaborationCard(collab)).join('');
    } else {
        container.innerHTML = '<p>You haven\'t collaborated on any songs yet. Browse trending songs to get started!</p>';
    }
}

// Create song card HTML
function createSongCard(song, isOwn = false) {
    return `
        <div class="song-card" data-song-id="${song.id}">
            <div class="song-cover">
                <div class="play-btn" onclick="playSong(${song.id})">▶️</div>
            </div>
            <div class="song-info">
                <h3 class="song-title">${song.title}</h3>
                <p class="song-artist">${song.User?.name || 'Unknown Artist'}</p>
                <p class="song-genre">${song.genre || 'No genre'}</p>
                <div class="song-stats">
                    <span class="votes">👍 <span class="vote-count">${song.votesCount || 0}</span></span>
                    <span class="collaborations">🤝 <span class="collab-count">${song.collaborationsCount || 0}</span></span>
                </div>
            </div>
            <div class="song-actions">
                ${!isOwn ? `<button class="btn-secondary btn-sm" onclick="collaborateOnSong(${song.id})">Collaborate</button>` : ''}
                <button class="btn-outline btn-sm" onclick="voteSong(${song.id})">Vote</button>
            </div>
        </div>
    `;
}

// Create collaboration card HTML
function createCollaborationCard(collaboration) {
    return `
        <div class="collaboration-item" data-collab-id="${collaboration.id}">
            <h4>${collaboration.Song?.title || 'Unknown Song'}</h4>
            <p>Contribution: ${collaboration.contributionType}</p>
            <p>Status: ${collaboration.status}</p>
            <small>Created: ${new Date(collaboration.createdAt).toLocaleDateString()}</small>
        </div>
    `;
}

// User menu functionality
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}

// Close user menu when clicking outside
document.addEventListener('click', (event) => {
    const userMenu = document.querySelector('.user-menu');
    if (!userMenu.contains(event.target)) {
        document.getElementById('userDropdown').classList.remove('show');
    }
});

// Modal functions
function openUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Upload form handler
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', document.getElementById('songTitle').value);
    formData.append('description', document.getElementById('songDescription').value);
    formData.append('genre', document.getElementById('songGenre').value);
    formData.append('audio', document.getElementById('songFile').files[0]);
    
    const collaborationTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    formData.append('collaborationTypes', JSON.stringify(collaborationTypes));
    
    try {
        const response = await fetch(`${API_BASE}/songs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('uploadModal');
            document.getElementById('uploadForm').reset();
            loadMySongs(); // Refresh the songs list
            alert('Song uploaded successfully!');
        } else {
            alert(data.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed. Please try again.');
    }
});

// Song interaction functions
async function playSong(songId) {
    // In a full implementation, this would play the audio file
    console.log('Playing song:', songId);
    alert('Play functionality would be implemented here');
}

async function collaborateOnSong(songId) {
    // In a full implementation, this would open collaboration interface
    console.log('Collaborating on song:', songId);
    alert('Collaboration interface would open here');
}

async function voteSong(songId) {
    const result = await apiCall(`/votes`, {
        method: 'POST',
        body: JSON.stringify({
            songId: songId,
            voteType: 'up'
        })
    });
    
    if (result) {
        // Update vote count in UI
        const songCard = document.querySelector(`[data-song-id="${songId}"]`);
        if (songCard) {
            const voteCount = songCard.querySelector('.vote-count');
            voteCount.textContent = parseInt(voteCount.textContent) + 1;
        }
        
        alert('Vote submitted!');
    } else {
        alert('Vote failed');
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', initDashboard);