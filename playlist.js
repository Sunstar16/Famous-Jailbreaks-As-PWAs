const PROXY_URL = 'http://146.70.145.58:8080/'; // Proxy URL
const M3U_URL = 'https://iptv-org.github.io/iptv/channels.m3u'; // Sample M3U playlist URL
const PLACEHOLDER_LOGO = 'https://via.placeholder.com/50x50.png?text=TV'; // Fallback logo
const HLS_JS_CDN = 'https://cdn.jsdelivr.net/npm/hls.js@latest'; // hls.js CDN

// Load hls.js dynamically
function loadHlsJs() {
  return new Promise((resolve, reject) => {
    if (window.Hls) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = HLS_JS_CDN;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load hls.js'));
    document.head.appendChild(script);
  });
}

// Test if a stream URL is accessible
async function testStreamUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
    return response.ok && response.headers.get('content-type')?.includes('application/vnd.apple.mpegurl');
  } catch {
    return false;
  }
}

// Fetch and parse M3U playlist
async function fetchM3U() {
  try {
    const response = await fetch(`${PROXY_URL}${M3U_URL}`);
    if (!response.ok) throw new Error('Failed to fetch M3U playlist');
    const text = await response.text();
    return parseM3U(text);
  } catch (error) {
    console.error('Error fetching M3U:', error);
    return [];
  }
}

// Parse M3U content into an array of channel objects
function parseM3U(text) {
  const lines = text.split('\n');
  const channels = [];
  let currentChannel = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#EXTINF:')) {
      currentChannel = {};
      const extinfMatch = trimmed.match(/#EXTINF:-?\d+\s*(.*?),\s*(.*)/);
      if (extinfMatch) {
        const attributesStr = extinfMatch[1];
        currentChannel.name = extinfMatch[2];
        const attrMatches = attributesStr.match(/(tvg-logo|group-title)="([^"]*)"/g) || [];
        for (const match of attrMatches) {
          const [key, value] = match.split('="');
          currentChannel[key.replace('"', '')] = value.replace('"', '');
        }
      }
    } else if (trimmed && !trimmed.startsWith('#') && currentChannel) {
      currentChannel.url = trimmed;
      channels.push(currentChannel);
      currentChannel = null;
    }
  }
  return channels;
}

// Create and append playlist UI
async function renderPlaylist() {
  const videoPlayer = document.getElementById('videoPlayer');
  if (!videoPlayer) {
    console.error('Video player not found');
    return;
  }

  // Load hls.js
  let hls;
  try {
    await loadHlsJs();
    if (window.Hls) {
      hls = new window.Hls();
    }
  } catch (error) {
    console.error('hls.js loading failed:', error);
  }

  // Create container
  const container = document.createElement('div');
  container.style.marginTop = '20px';
  container.style.padding = '10px';
  container.style.maxWidth = '800px';
  container.style.marginLeft = 'auto';
  container.style.marginRight = 'auto';

  // Create error message div
  const errorMessage = document.createElement('div');
  errorMessage.style.color = 'red';
  errorMessage.style.padding = '10px';
  errorMessage.style.backgroundColor = '#ffe6e6';
  errorMessage.style.borderRadius = '4px';
  errorMessage.style.display = 'none';
  container.appendChild(errorMessage);

  // Create search bar
  const searchBar = document.createElement('input');
  searchBar.type = 'text';
  searchBar.placeholder = 'Search channels...';
  searchBar.style.width = '100%';
  searchBar.style.padding = '8px';
  searchBar.style.marginBottom = '10px';
  searchBar.style.border = '1px solid #ccc';
  searchBar.style.borderRadius = '4px';
  container.appendChild(searchBar);

  // Create channel list container
  const channelList = document.createElement('div');
  container.appendChild(channelList);

  // Insert container after video player
  videoPlayer.parentNode.insertBefore(container, videoPlayer.nextSibling);

  // Fetch channels
  const channels = await fetchM3U();
  if (channels.length === 0) {
    channelList.innerHTML = '<p>No channels available.</p>';
    return;
  }

  // Group channels by category
  const categories = {};
  for (const channel of channels) {
    const category = channel['group-title'] || 'Uncategorized';
    if (!categories[category]) categories[category] = [];
    categories[category].push(channel);
  }

  // Play stream function
  async function playStream(channel) {
    const streamUrl = `${PROXY_URL}${channel.url}`;
    errorMessage.style.display = 'none';

    // Test stream accessibility
    const isValid = await testStreamUrl(streamUrl);
    if (!isValid) {
      errorMessage.textContent = `Error: Unable to load stream for ${channel.name}. The stream may be unavailable or unsupported.`;
      errorMessage.style.display = 'block';
      return;
    }

    if (hls && window.Hls.isSupported()) {
      // Use hls.js for HLS streams
      hls.loadSource(streamUrl);
      hls.attachMedia(videoPlayer);
      hls.on(window.Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        errorMessage.textContent = `Error: Failed to play ${channel.name}. ${data.details}`;
        errorMessage.style.display = 'block';
      });
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support
      videoPlayer.src = streamUrl;
    } else {
      errorMessage.textContent = `Error: Your browser does not support HLS streaming for ${channel.name}.`;
      errorMessage.style.display = 'block';
      return;
    }

    videoPlayer.play().catch((e) => {
      console.error('Playback error:', e);
      errorMessage.textContent = `Error: Failed to play ${channel.name}. ${e.message}`;
      errorMessage.style.display = 'block';
    });
  }

  // Render channels
  function renderChannels(filteredChannels = channels) {
    channelList.innerHTML = '';
    const categoryKeys = Object.keys(categories).sort();
    for (const category of categoryKeys) {
      const categoryChannels = filteredChannels.filter(
        (ch) => (ch['group-title'] || 'Uncategorized') === category
      );
      if (categoryChannels.length === 0) continue;

      // Create category header
      const categoryHeader = document.createElement('h3');
      categoryHeader.textContent = category;
      categoryHeader.style.marginTop = '15px';
      channelList.appendChild(categoryHeader);

      // Create channel list for category
      const ul = document.createElement('ul');
      ul.style.listStyle = 'none';
      ul.style.padding = '0';
      for (const channel of categoryChannels) {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.padding = '5px 0';
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => playStream(channel));

        // Logo
        const img = document.createElement('img');
        img.src = channel['tvg-logo'] || PLACEHOLDER_LOGO;
        img.alt = channel.name;
        img.style.width = '50px';
        img.style.height = '50px';
        img.style.marginRight = '10px';
        img.style.objectFit = 'contain';
        img.onerror = () => (img.src = PLACEHOLDER_LOGO);
        li.appendChild(img);

        // Channel name
        const span = document.createElement('span');
        span.textContent = channel.name;
        li.appendChild(span);

        ul.appendChild(li);
      }
      channelList.appendChild(ul);
    }
  }

  // Initial render
  renderChannels();

  // Search functionality
  searchBar.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filteredChannels = channels.filter(
      (channel) =>
        channel.name.toLowerCase().includes(query) ||
        (channel['group-title'] || '').toLowerCase().includes(query)
    );
    renderChannels(filteredChannels);
  });
}

// Run when DOM is loaded
document.addEventListener('DOMContentLoaded', renderPlaylist);