// Profile page functionality
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

// Initialize profile
async function initProfile() {
    if (!checkAuth()) return;
    
    await loadUserProfile();
    await loadUserStats();
    await loadUserSkills();
    await loadRecentActivity();
}

// Load user profile data
async function loadUserProfile() {
    const user = await apiCall(`/users/${currentUser.id}`);
    
    if (user) {
        document.getElementById('profileName').textContent = user.name || 'Your Name';
        document.getElementById('profileBio').textContent = user.bio || 'Music enthusiast and collaborator';
        
        // Update settings form
        document.getElementById('settingsEmail').value = user.email || '';
        document.getElementById('settingsName').value = user.name || '';
        document.getElementById('settingsBio').value = user.bio || '';
        
        // Update edit profile form
        document.getElementById('editName').value = user.name || '';
        document.getElementById('editBio').value = user.bio || '';
        
        // Update privacy settings
        document.getElementById('publicProfile').checked = user.isPublic || false;
        document.getElementById('emailNotifications').checked = user.emailNotifications || false;
    }
}

// Load user statistics
async function loadUserStats() {
    const stats = await apiCall(`/users/${currentUser.id}/stats`);
    
    if (stats) {
        document.getElementById('profileSongs').textContent = stats.songsCount || 0;
        document.getElementById('profileCollabs').textContent = stats.collaborationsCount || 0;
        document.getElementById('profileFollowers').textContent = stats.followersCount || 0;
        document.getElementById('profileFollowing').textContent = stats.followingCount || 0;
    }
}

// Load user skills
async function loadUserSkills() {
    const user = await apiCall(`/users/${currentUser.id}`);
    
    if (user && user.skills) {
        const skillsContainer = document.getElementById('userSkills');
        const skills = Array.isArray(user.skills) ? user.skills : JSON.parse(user.skills || '[]');
        
        skillsContainer.innerHTML = skills.map(skill => 
            `<span class="skill-tag">${skill}</span>`
        ).join('');
        
        // Update form selects
        updateSelectOptions('editSkills', skills);
        updateSelectOptions('instruments', skills);
    }
}

// Load recent activity
async function loadRecentActivity() {
    const activity = await apiCall(`/users/${currentUser.id}/activity`);
    const container = document.getElementById('recentActivity');
    
    if (activity && activity.length > 0) {
        container.innerHTML = activity.map(item => 
            `<div class="activity-item">
                <strong>${item.type}</strong>
                <p>${item.description}</p>
                <small>${new Date(item.createdAt).toLocaleDateString()}</small>
            </div>`
        ).join('');
    } else {
        container.innerHTML = '<p>No recent activity</p>';
    }
}

// Update select options
function updateSelectOptions(selectId, selectedValues) {
    const select = document.getElementById(selectId);
    if (select) {
        Array.from(select.options).forEach(option => {
            option.selected = selectedValues.includes(option.value);
        });
    }
}

// Profile tab functionality
function showProfileTab(tabName) {
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
        case 'songs':
            loadUserSongs();
            break;
        case 'collaborations':
            loadUserCollaborations();
            break;
    }
}

// Load user songs
async function loadUserSongs() {
    const songs = await apiCall(`/users/${currentUser.id}/songs`);
    const container = document.getElementById('userSongs');
    
    if (songs && songs.length > 0) {
        container.innerHTML = songs.map(song => createSongCard(song)).join('');
    } else {
        container.innerHTML = '<p>No songs uploaded yet</p>';
    }
}

// Load user collaborations
async function loadUserCollaborations() {
    const collaborations = await apiCall(`/users/${currentUser.id}/collaborations`);
    const container = document.getElementById('userCollaborations');
    
    if (collaborations && collaborations.length > 0) {
        container.innerHTML = collaborations.map(collab => createCollaborationCard(collab)).join('');
    } else {
        container.innerHTML = '<p>No collaborations yet</p>';
    }
}

// Create song card HTML
function createSongCard(song) {
    return `
        <div class="song-card" data-song-id="${song.id}">
            <div class="song-cover">
                <div class="play-btn" onclick="playSong(${song.id})">▶️</div>
            </div>
            <div class="song-info">
                <h3 class="song-title">${song.title}</h3>
                <p class="song-genre">${song.genre || 'No genre'}</p>
                <div class="song-stats">
                    <span class="votes">👍 ${song.votesCount || 0}</span>
                    <span class="collaborations">🤝 ${song.collaborationsCount || 0}</span>
                </div>
            </div>
            <div class="song-actions">
                <button class="btn-secondary btn-sm" onclick="editSong(${song.id})">Edit</button>
                <button class="btn-outline btn-sm" onclick="deleteSong(${song.id})">Delete</button>
            </div>
        </div>
    `;
}

// Create collaboration card HTML
function createCollaborationCard(collaboration) {
    return `
        <div class="collaboration-item">
            <h4>${collaboration.Song?.title || 'Unknown Song'}</h4>
            <p>Your contribution: ${collaboration.contributionType}</p>
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

// Modal functions
function openEditProfileModal() {
    document.getElementById('editProfileModal').style.display = 'block';
}

function openAvatarModal() {
    document.getElementById('avatarModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Form handlers
document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('editName').value;
    const bio = document.getElementById('editBio').value;
    const skillsSelect = document.getElementById('editSkills');
    const skills = Array.from(skillsSelect.selectedOptions).map(option => option.value);
    
    const result = await apiCall(`/users/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, bio, skills })
    });
    
    if (result) {
        // Update localStorage
        currentUser.name = name;
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        closeModal('editProfileModal');
        await loadUserProfile();
        await loadUserSkills();
        alert('Profile updated successfully!');
    } else {
        alert('Failed to update profile');
    }
});

document.getElementById('accountSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('settingsEmail').value;
    const name = document.getElementById('settingsName').value;
    const bio = document.getElementById('settingsBio').value;
    
    const result = await apiCall(`/users/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ email, name, bio })
    });
    
    if (result) {
        currentUser.name = name;
        currentUser.email = email;
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        alert('Account settings updated successfully!');
    } else {
        alert('Failed to update settings');
    }
});

document.getElementById('preferencesForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const genresSelect = document.getElementById('favoriteGenres');
    const instrumentsSelect = document.getElementById('instruments');
    
    const favoriteGenres = Array.from(genresSelect.selectedOptions).map(option => option.value);
    const instruments = Array.from(instrumentsSelect.selectedOptions).map(option => option.value);
    
    const result = await apiCall(`/users/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
            favoriteGenres,
            skills: instruments
        })
    });
    
    if (result) {
        alert('Preferences updated successfully!');
    } else {
        alert('Failed to update preferences');
    }
});

// Avatar upload
document.getElementById('avatarFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('avatarPreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

async function uploadAvatar() {
    const file = document.getElementById('avatarFile').files[0];
    if (!file) {
        alert('Please select an image first');
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetch(`${API_BASE}/users/${currentUser.id}/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('profileAvatar').src = result.avatarUrl;
            closeModal('avatarModal');
            alert('Avatar updated successfully!');
        } else {
            alert('Failed to update avatar');
        }
    } catch (error) {
        console.error('Avatar upload error:', error);
        alert('Failed to update avatar');
    }
}

// Song actions
async function playSong(songId) {
    console.log('Playing song:', songId);
    alert('Play functionality would be implemented here');
}

async function editSong(songId) {
    console.log('Editing song:', songId);
    alert('Edit song functionality would be implemented here');
}

async function deleteSong(songId) {
    if (confirm('Are you sure you want to delete this song?')) {
        const result = await apiCall(`/songs/${songId}`, {
            method: 'DELETE'
        });
        
        if (result) {
            loadUserSongs(); // Refresh the songs list
            alert('Song deleted successfully');
        } else {
            alert('Failed to delete song');
        }
    }
}

// Share profile
function shareProfile() {
    const profileUrl = `${window.location.origin}/profile.html?user=${currentUser.id}`;
    navigator.clipboard.writeText(profileUrl).then(() => {
        alert('Profile link copied to clipboard!');
    }).catch(() => {
        alert(`Share this link: ${profileUrl}`);
    });
}

// Privacy settings handlers
document.getElementById('publicProfile').addEventListener('change', async (e) => {
    const result = await apiCall(`/users/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isPublic: e.target.checked })
    });
    
    if (!result) {
        e.target.checked = !e.target.checked; // Revert on failure
        alert('Failed to update privacy setting');
    }
});

document.getElementById('emailNotifications').addEventListener('change', async (e) => {
    const result = await apiCall(`/users/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ emailNotifications: e.target.checked })
    });
    
    if (!result) {
        e.target.checked = !e.target.checked; // Revert on failure
        alert('Failed to update notification setting');
    }
});

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Close user menu when clicking outside
document.addEventListener('click', (event) => {
    const userMenu = document.querySelector('.user-menu');
    if (!userMenu.contains(event.target)) {
        document.getElementById('userDropdown').classList.remove('show');
    }
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Initialize profile when page loads
document.addEventListener('DOMContentLoaded', initProfile);