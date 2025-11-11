const API_KEY = 'pDf3hxBVRA5eOT8nagYHsfSfiTWxgeNDEL7woGY2';
const API_URL = 'https://api.nasa.gov/planetary/apod';
const STORAGE_KEY = 'nasa_searches';

const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const container = document.getElementById('current-image-container');
const historyList = document.getElementById('search-history');
const clearBtn = document.getElementById('clear-history');
const keyIndicator = document.getElementById('key-indicator');

// sensible APOD bounds
const APOD_MIN = '1995-06-16';

// Save a date string (YYYY-MM-DD) to localStorage
function saveSearch(date) {
	if (!date) return;
	const raw = localStorage.getItem(STORAGE_KEY);
	let searches = raw ? JSON.parse(raw) : [];
	// Avoid duplicates; keep most recent first
	searches = searches.filter(d => d !== date);
	searches.unshift(date);
	// Keep a reasonable limit
	searches = searches.slice(0, 20);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
}

// Render search history from localStorage
function addSearchToHistory() {
	historyList.innerHTML = '';
	const raw = localStorage.getItem(STORAGE_KEY);
	const searches = raw ? JSON.parse(raw) : [];
	if (searches.length === 0) {
		const li = document.createElement('li');
		const span = document.createElement('span');
		span.textContent = 'No saved searches yet.';
		span.style.opacity = '0.7';
		li.appendChild(span);
		historyList.appendChild(li);
		return;
	}

	searches.forEach(date => {
		const li = document.createElement('li');
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'history-btn';
		btn.textContent = date;
		btn.addEventListener('click', () => {
			getImageOfTheDay(date);
		});
		li.appendChild(btn);
		historyList.appendChild(li);
	});
}

// Display fetched result in the UI
function displayData(data) {
	try {
		container.innerHTML = '';

	const meta = document.createElement('div');
	meta.className = 'meta';

	const title = document.createElement('h3');
	title.textContent = data.title || 'NASA APOD';
	meta.appendChild(title);

	const date = document.createElement('span');
	date.textContent = data.date || '';
	date.style.color = 'var(--muted)';
	meta.appendChild(date);

	container.appendChild(meta);

	if (data.media_type === 'image') {
		const img = document.createElement('img');
		img.src = data.url;
		img.alt = data.title || 'APOD image';
		container.appendChild(img);
	} else if (data.media_type === 'video') {
		const iframe = document.createElement('iframe');
		// Try to normalize YouTube watch URLs to embed URLs
		const videoUrl = data.url || data.embed_url || '';
		if (isYouTubeUrl(videoUrl)) {
			iframe.src = toYouTubeEmbed(videoUrl);
		} else {
			iframe.src = videoUrl;
		}
		iframe.allow = 'encrypted-media; fullscreen';
		container.appendChild(iframe);
		// If not an embeddable URL, provide a direct link as fallback
		if (!isEmbeddable(videoUrl)) {
			const a = document.createElement('a');
			a.href = videoUrl;
			a.target = '_blank';
			a.rel = 'noopener noreferrer';
			a.className = 'fallback-link';
			a.textContent = 'Open video in new tab';
			container.appendChild(a);
		}
	} else {
		const p = document.createElement('p');
		p.textContent = 'Media type not supported.';
		container.appendChild(p);
	}

	const explanation = document.createElement('p');
	explanation.textContent = data.explanation || '';
	explanation.style.color = 'var(--muted)';
	container.appendChild(explanation);

	if (data.copyright) {
		const copyright = document.createElement('p');
		copyright.textContent = `© ${data.copyright}`;
		copyright.style.color = 'var(--muted)';
		container.appendChild(copyright);
	}
	} catch (err) {
		console.error('Error rendering APOD data:', err);
		container.innerHTML = `<p style="color:var(--muted)">An error occurred while displaying the result.</p>`;
	}
}

// Fetch and display the APOD for the provided date (or from form submit)
async function getImageOfTheDay(dateOrEvent) {
	let date = null;
	if (typeof dateOrEvent === 'string') {
		date = dateOrEvent;
	} else if (dateOrEvent && dateOrEvent.preventDefault) {
		dateOrEvent.preventDefault();
		date = input.value;
	}

	if (!date) {
		alert('Please select a date.');
		return;
	}
	try {
		showLoading();
		const url = `${API_URL}?api_key=${API_KEY}&date=${date}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		displayData(data);
		// Save and update history only when user explicitly searched (form submit or clicking a history item)
		saveSearch(date);
		addSearchToHistory();
	} catch (err) {
		console.error('Error fetching APOD:', err);
		container.innerHTML = `<p style="color:var(--muted)">Unable to load data for ${date}. Please try another date.</p>`;
	} finally {
		hideLoading();
	}
}

// Fetch and show the current image of the day (on load)
async function getCurrentImageOfTheDay() {
	const currentDate = new Date().toISOString().split('T')[0];
	try {
		showLoading();
		const url = `${API_URL}?api_key=${API_KEY}&date=${currentDate}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		displayData(data);
	} catch (err) {
		console.error('Error fetching current APOD:', err);
		container.innerHTML = `<p style="color:var(--muted)">Unable to load today's image.</p>`;
	} finally {
		hideLoading();
	}
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
	form.addEventListener('submit', getImageOfTheDay);
	addSearchToHistory();
	// set sensible min/max and pre-fill date input
	const today = new Date().toISOString().split('T')[0];
	if (input) {
		input.min = APOD_MIN;
		input.max = today;
		// prefill with today for convenience
		if (!input.value) input.value = today;
	}
	// indicate whether demo key is used
	if (keyIndicator) {
		if (API_KEY === 'DEMO_KEY') {
			keyIndicator.textContent = 'Using demo API key. Replace it in script.js to avoid rate limits.';
		} else {
			keyIndicator.textContent = '';
		}
	}
	// clear history handler
	if (clearBtn) {
		clearBtn.addEventListener('click', () => {
			if (confirm('Clear all saved searches?')) {
				localStorage.removeItem(STORAGE_KEY);
				addSearchToHistory();
			}
		});
	}
	// Show current image on load
	getCurrentImageOfTheDay();
});

// Loading helpers
function showLoading() {
  if (!container) return;
  // keep header/meta area but show spinner below
  container.innerHTML = '';
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  container.appendChild(spinner);
}
function hideLoading() {
	if (!container) return;
	// remove any spinner elements left behind
	const spinners = container.querySelectorAll('.spinner');
	spinners.forEach(s => s.remove());
}

// Helpers for video embedding
function isYouTubeUrl(url) {
  return /youtu(?:\.be|be\.com)/i.test(url);
}
function toYouTubeEmbed(url) {
  try {
    // Extract video id from common YouTube URL formats
    const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?#]|$)/);
    if (m && m[1]) return `https://www.youtube.com/embed/${m[1]}`;
    // youtu.be short link
    const m2 = url.match(/youtu\.be\/([0-9A-Za-z_-]{11})/);
    if (m2 && m2[1]) return `https://www.youtube.com/embed/${m2[1]}`;
  } catch (e) {
    // fallback
  }
  return url;
}

function isEmbeddable(url) {
  if (!url) return false;
  // simple check: youtube embed is embeddable; other URLs may or may not be
  if (isYouTubeUrl(url)) return true;
  if (url.includes('embed')) return true;
  return true; // optimistic default
}
