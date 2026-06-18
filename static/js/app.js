// Application State
let appState = {
    notes: [],            // Raw release notes from API
    filteredNotes: [],    // Notes after search and category filtering
    filters: {
        search: '',
        category: 'ALL'
    },
    activeTweet: {
        update: null,
        date: '',
        link: ''
    }
};

// DOM Elements
const elements = {
    btnRefresh: document.getElementById('btn-refresh'),
    spinnerIcon: document.getElementById('spinner-icon'),
    cacheIndicator: document.getElementById('cache-indicator'),
    
    // Stats
    statDays: document.getElementById('stat-days'),
    statUpdates: document.getElementById('stat-updates'),
    statLatest: document.getElementById('stat-latest'),
    
    // Filters
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    filterPills: document.getElementById('filter-pills'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    
    // Feed Area
    skeletonLoader: document.getElementById('skeleton-loader'),
    notesList: document.getElementById('notes-list'),
    emptyState: document.getElementById('empty-state'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCount: document.getElementById('char-count'),
    charWarning: document.getElementById('char-warning'),
    previewText: document.getElementById('tweet-preview-text'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelTweet: document.getElementById('btn-cancel-tweet'),
    btnSubmitTweet: document.getElementById('btn-submit-tweet'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchNotes(false);
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh action
    elements.btnRefresh.addEventListener('click', () => {
        fetchNotes(true);
    });
    
    // Reset filters empty state button
    elements.btnResetFilters.addEventListener('click', resetFilters);
    
    // Search input
    elements.searchInput.addEventListener('input', (e) => {
        appState.filters.search = e.target.value.trim().toLowerCase();
        
        // Show/hide clear button
        if (appState.filters.search) {
            elements.clearSearch.style.display = 'block';
        } else {
            elements.clearSearch.style.display = 'none';
        }
        
        applyFilters();
    });
    
    // Clear search
    elements.clearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        appState.filters.search = '';
        elements.clearSearch.style.display = 'none';
        applyFilters();
        elements.searchInput.focus();
    });
    
    // Category pills selection
    elements.filterPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;
        
        // Update active class
        document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        
        appState.filters.category = pill.dataset.category;
        applyFilters();
    });
    
    // Modal controls
    elements.btnCloseModal.addEventListener('click', closeTweetModal);
    elements.btnCancelTweet.addEventListener('click', closeTweetModal);
    
    // Close modal on click outside card
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetModal();
        }
    });
    
    // Textarea typing updates count and preview
    elements.tweetTextarea.addEventListener('input', () => {
        updateTweetPreview();
    });
    
    // Submit Tweet (X Intent)
    elements.btnSubmitTweet.addEventListener('click', submitTweet);
}

// Fetch notes from Flask API
async function fetchNotes(forceRefresh = false) {
    showLoading(true);
    
    try {
        const url = `/api/release-notes?refresh=${forceRefresh}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            appState.notes = data.notes;
            
            // Show cache badge if load was cached
            if (data.cached) {
                elements.cacheIndicator.classList.add('visible');
            } else {
                elements.cacheIndicator.classList.remove('visible');
                if (forceRefresh) {
                    showToast("Feed refreshed successfully");
                }
            }
            
            updateStats();
            applyFilters();
        } else {
            throw new Error(data.error || "Failed to load release notes.");
        }
    } catch (error) {
        console.error("Fetch notes error:", error);
        showToast(`Error: ${error.message}`);
        // Render empty state if we have no data at all
        if (appState.notes.length === 0) {
            showEmptyState(true);
        }
    } finally {
        showLoading(false);
    }
}

// Stats dashboard computation
function updateStats() {
    if (appState.notes.length === 0) {
        elements.statDays.textContent = '0';
        elements.statUpdates.textContent = '0';
        elements.statLatest.textContent = 'N/A';
        return;
    }
    
    elements.statDays.textContent = appState.notes.length;
    
    // Count total update sub-items
    let totalUpdates = 0;
    appState.notes.forEach(note => {
        totalUpdates += (note.updates ? note.updates.length : 0);
    });
    elements.statUpdates.textContent = totalUpdates;
    
    // Find latest update date
    const latestDate = appState.notes[0]?.date || 'N/A';
    elements.statLatest.textContent = latestDate;
}

// Apply client-side filters
function applyFilters() {
    const { search, category } = appState.filters;
    
    appState.filteredNotes = appState.notes.map(note => {
        // Create a copy of the note and filter its updates list
        const filteredUpdates = note.updates.filter(update => {
            // Check category filter first
            if (category !== 'ALL' && update.category.toLowerCase() !== category.toLowerCase()) {
                return false;
            }
            
            // Check search filter second
            if (search) {
                const inCategory = update.category.toLowerCase().includes(search);
                const inText = update.text.toLowerCase().includes(search);
                const inDate = note.date.toLowerCase().includes(search);
                return inCategory || inText || inDate;
            }
            
            return true;
        });
        
        return {
            ...note,
            updates: filteredUpdates
        };
    }).filter(note => note.updates.length > 0); // Keep only days with at least one matching update
    
    renderNotes();
}

// Reset all filters to default
function resetFilters() {
    elements.searchInput.value = '';
    appState.filters.search = '';
    appState.filters.category = 'ALL';
    elements.clearSearch.style.display = 'none';
    
    // Update pills active state
    document.querySelectorAll('.filter-pills .pill').forEach(p => {
        p.classList.remove('active');
        if (p.dataset.category === 'ALL') {
            p.classList.add('active');
        }
    });
    
    applyFilters();
}

// Render release notes into UI
function renderNotes() {
    if (appState.filteredNotes.length === 0) {
        elements.notesList.style.display = 'none';
        showEmptyState(true);
        return;
    }
    
    showEmptyState(false);
    elements.notesList.style.display = 'flex';
    
    // Clear list
    elements.notesList.innerHTML = '';
    
    appState.filteredNotes.forEach((note, dayIdx) => {
        const dayGroup = document.createElement('div');
        dayGroup.className = 'note-day-group';
        dayGroup.style.animation = `fade-in 0.3s ease-out forwards`;
        dayGroup.style.animationDelay = `${Math.min(dayIdx * 0.05, 0.5)}s`;
        
        // Header HTML
        let headerHTML = `
            <div class="note-day-header">
                <h2 class="note-date"><i class="fa-regular fa-calendar-check"></i> ${note.date}</h2>
                ${note.link ? `<a href="${note.link}" target="_blank" rel="noopener" class="note-original-link">docs <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
            </div>
        `;
        
        // Updates HTML
        let updatesHTML = '<div class="updates-container">';
        note.updates.forEach((update, uIdx) => {
            const catClass = getCategoryClass(update.category);
            
            updatesHTML += `
                <div class="update-block" id="update-${dayIdx}-${uIdx}">
                    <div class="update-meta-row">
                        <span class="category-tag ${catClass}">${update.category}</span>
                        <div class="update-actions">
                            <button class="btn-tweet-action" onclick="prepareTweet(${dayIdx}, ${uIdx})">
                                <i class="fa-brands fa-x-twitter"></i> Tweet
                            </button>
                        </div>
                    </div>
                    <div class="update-desc">
                        ${update.html}
                    </div>
                </div>
            `;
        });
        updatesHTML += '</div>';
        
        dayGroup.innerHTML = headerHTML + updatesHTML;
        elements.notesList.appendChild(dayGroup);
    });
}

// Map categories to CSS classes
function getCategoryClass(category) {
    const cat = category.toLowerCase();
    if (cat.includes('feature')) return 'tag-feature';
    if (cat.includes('announcement')) return 'tag-announcement';
    if (cat.includes('issue')) return 'tag-issue';
    if (cat.includes('change')) return 'tag-change';
    if (cat.includes('deprecation')) return 'tag-deprecation';
    return 'tag-general';
}

// Show/hide loading spinners and states
function showLoading(isLoading) {
    if (isLoading) {
        elements.spinnerIcon.classList.add('spinning');
        elements.btnRefresh.disabled = true;
        elements.notesList.style.display = 'none';
        elements.emptyState.style.display = 'none';
        elements.skeletonLoader.style.display = 'flex';
    } else {
        elements.spinnerIcon.classList.remove('spinning');
        elements.btnRefresh.disabled = false;
        elements.skeletonLoader.style.display = 'none';
    }
}

// Show/hide empty state message
function showEmptyState(show) {
    if (show) {
        elements.emptyState.style.display = 'block';
    } else {
        elements.emptyState.style.display = 'none';
    }
}

// Show feedback Toast message
function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.style.display = 'flex';
    
    // Trigger paint to restart animation
    elements.toast.offsetHeight;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
        setTimeout(() => {
            elements.toast.style.display = 'none';
        }, 300);
    }, 3500);
}

// Prepare Tweet details when "Tweet" button inside update card is clicked
window.prepareTweet = function(dayIdx, uIdx) {
    const note = appState.filteredNotes[dayIdx];
    const update = note.updates[uIdx];
    
    // Visual Highlight of selected card
    document.querySelectorAll('.update-block').forEach(b => b.classList.remove('selected'));
    const updateBlock = document.getElementById(`update-${dayIdx}-${uIdx}`);
    if (updateBlock) {
        updateBlock.classList.add('selected');
    }
    
    appState.activeTweet.update = update;
    appState.activeTweet.date = note.date;
    appState.activeTweet.link = note.link;
    
    // Generate draft text intelligently keeping characters in check
    // Twitter standard post limit is 280 chars
    // Format: "BigQuery Update [Date] - [Category]: [Truncated text] [Link] #BigQuery"
    const prefix = `BigQuery Update (${note.date}) - [${update.category}]: `;
    const suffix = `\n\nRead more: ${note.link} #BigQuery #GoogleCloud`;
    
    // 280 - prefix_len - suffix_len - 3 (ellipsis)
    const allowedTextLength = 280 - prefix.length - suffix.length - 3;
    
    let textBody = update.text;
    if (textBody.length > allowedTextLength) {
        textBody = textBody.substring(0, allowedTextLength).trim() + "...";
    }
    
    const draftText = `${prefix}${textBody}${suffix}`;
    
    // Populate modal textarea
    elements.tweetTextarea.value = draftText;
    
    // Open Modal
    elements.tweetModal.style.display = 'flex';
    elements.tweetTextarea.focus();
    
    updateTweetPreview();
};

// Close Tweet Composer modal
function closeTweetModal() {
    elements.tweetModal.style.display = 'none';
}

// Update Tweet characters count and rendering preview
function updateTweetPreview() {
    const text = elements.tweetTextarea.value;
    const len = text.length;
    
    elements.charCount.textContent = len;
    elements.previewText.textContent = text;
    
    // Character Limit Warning
    if (len > 280) {
        elements.charCount.classList.add('warning');
        elements.charWarning.style.display = 'flex';
        elements.btnSubmitTweet.disabled = true;
    } else {
        elements.charCount.classList.remove('warning');
        elements.charWarning.style.display = 'none';
        elements.btnSubmitTweet.disabled = false;
    }
}

// Launch Twitter (X) Web Intent URL and close modal
function submitTweet() {
    const text = elements.tweetTextarea.value;
    if (text.length > 280) {
        showToast("Tweet exceeds the 280 character limit");
        return;
    }
    
    const tweetIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    // Open X in new tab
    window.open(tweetIntentUrl, '_blank', 'noopener,noreferrer');
    
    closeTweetModal();
    showToast("Opening X/Twitter to publish draft...");
}
