/* ==========================================================================
   CYPHER COPLAY - FRONTEND APP ENGINE (VANILLA JS & SOCKET.IO)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Socket.io (Served natively by the same Express server)
  const socket = io();

  // --- STATE VARIABLES ---
  let username = "";
  let avatarUrl = "";
  let roomId = "";
  let isHost = false;
  let isMuted = false;
  let isDeafened = false;
  let isVoiceConnected = false;
  
  let hlsInstance = null;
  let currentAnimeData = null;
  let currentEpisodeNumber = null;
  let activeChannel = "general";
  let activeTab = "catalog";
  let activeRightTab = "chat";
  
  // Catalog State
  let catalogPage = 1;
  let catalogGenre = "";
  let isLoadingMore = false;
  let hasMorePages = true;
  let currentMode = "catalog"; // "catalog" | "search"
  let infiniteObserver = null;
  
  // Sync Guard flags to prevent infinite socket playback loops
  let isSyncingPlayback = false;

  // --- DOM ELEMENTS ---
  // Onboarding
  const onboardingOverlay = document.getElementById('onboarding-overlay');
  const inputUsername = document.getElementById('onboarding-username');
  const inputRoomId = document.getElementById('onboarding-room-id');
  const btnCreateRoom = document.getElementById('btn-create-room');
  const btnJoinRoom = document.getElementById('btn-join-room');
  const avatarPreview = document.getElementById('avatar-preview');
  const btnRandomAvatar = document.getElementById('btn-random-avatar');

  // App Layout
  const appLayout = document.querySelector('.app-layout');
  const roomCodeDisplay = document.getElementById('room-code-display');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const btnLeave = document.getElementById('btn-leave');
  
  // Profile Footer
  const userFooterAvatar = document.getElementById('user-footer-avatar');
  const userFooterName = document.getElementById('user-footer-name');
  const btnToggleMic = document.getElementById('btn-toggle-mic');
  const btnToggleDeafen = document.getElementById('btn-toggle-deafen');

  // Navigation
  const btnTabCatalog = document.getElementById('btn-tab-catalog');
  const btnTabCinema = document.getElementById('btn-tab-cinema');
  const btnTabActivities = document.getElementById('btn-tab-activities');
  
  const panelCatalog = document.getElementById('panel-catalog');
  const panelCinema = document.getElementById('panel-cinema');
  const panelActivities = document.getElementById('panel-activities');

  // Right Side Panel
  const tabBtnChat = document.getElementById('tab-btn-chat');
  const tabBtnMembers = document.getElementById('tab-btn-members');
  const tabContentChat = document.getElementById('tab-content-chat');
  const tabContentMembers = document.getElementById('tab-content-members');
  const chatMessages = document.getElementById('chat-messages');
  const chatTextarea = document.getElementById('chat-textarea');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const typingIndicator = document.getElementById('typing-indicator');
  const membersList = document.getElementById('members-list');
  const memberCount = document.getElementById('member-count');
  
  // Channels
  const channelItems = document.querySelectorAll('.channel-item');
  const btnJoinVoice = document.getElementById('btn-join-voice');
  const voiceConnectedStatus = document.getElementById('voice-connected-status');
  const voiceUsersList = document.getElementById('voice-users-list');

  // Catalog tab elements
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const resultsGrid = document.getElementById('results-grid');
  const genreFilters = document.getElementById('genre-filters');
  const scrollSentinel = document.getElementById('scroll-sentinel');
  const viewTitle = document.getElementById('view-title');
  const viewSubtitle = document.getElementById('view-subtitle');

  // Details overlay
  const detailOverlay = document.getElementById('detail-overlay');
  const btnCloseDetail = document.getElementById('btn-close-detail');
  const animeTitle = document.getElementById('anime-title');
  const animeDescription = document.getElementById('anime-description');
  const animeType = document.getElementById('anime-type');
  const animePoster = document.getElementById('anime-poster');
  const animeGenres = document.getElementById('anime-genres');
  const episodesGrid = document.getElementById('episodes-grid');

  // Cinema Player elements
  const playingTitle = document.getElementById('playing-title');
  const playingSubtitle = document.getElementById('playing-subtitle');
  const mainPlayer = document.getElementById('main-player');
  const videoLoader = document.getElementById('video-loader');
  const syncNoticeOverlay = document.getElementById('sync-notice-overlay');
  const syncNoticeText = document.getElementById('sync-notice-text');
  const playerPrevBtn = document.getElementById('player-prev-btn');
  const playerNextBtn = document.getElementById('player-next-btn');
  const playerSyncForce = document.getElementById('player-sync-force');
  const playerExternalBtn = document.getElementById('player-external-btn');
  const serversList = document.getElementById('servers-list');

  // Whiteboard Canvas elements
  const paintCanvas = document.getElementById('paint-canvas');
  const ctx = paintCanvas.getContext('2d');
  const btnClearCanvas = document.getElementById('btn-clear-canvas');
  const brushSizeInput = document.getElementById('brush-size');
  const colorDots = document.querySelectorAll('.color-dot');

  // Tic-Tac-Toe Game elements
  const tttStatus = document.getElementById('ttt-status');
  const tttBoard = document.getElementById('ttt-board');
  const tttCells = document.querySelectorAll('.ttt-cell');
  const btnJoinTtt = document.getElementById('btn-join-ttt');
  const btnResetTtt = document.getElementById('btn-reset-ttt');

  // --- AVATAR GENERATOR ---
  function randomizeAvatar() {
    const randomSeed = Math.random().toString(36).substring(7);
    avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomSeed}`;
    avatarPreview.src = avatarUrl;
  }
  
  // Set initial random avatar
  randomizeAvatar();
  
  btnRandomAvatar.addEventListener('click', randomizeAvatar);

  // --- ROOM JOIN / CREATION ---
  btnCreateRoom.addEventListener('click', () => {
    const nick = inputUsername.value.trim();
    if (!nick) {
      alert("Por favor, ingresa un apodo.");
      return;
    }
    username = nick;
    // Generate random room code
    roomId = "SALA-" + Math.floor(1000 + Math.random() * 9000);
    startCoPlay();
  });

  btnJoinRoom.addEventListener('click', () => {
    const nick = inputUsername.value.trim();
    const code = inputRoomId.value.trim().toUpperCase();
    if (!nick) {
      alert("Por favor, ingresa un apodo.");
      return;
    }
    if (!code) {
      alert("Por favor, ingresa el código de la sala.");
      return;
    }
    username = nick;
    roomId = code;
    startCoPlay();
  });

  function startCoPlay() {
    onboardingOverlay.style.display = 'none';
    appLayout.style.display = 'grid';
    
    // Set UI footer info
    userFooterAvatar.src = avatarUrl;
    userFooterName.textContent = username;
    roomCodeDisplay.textContent = `ID: ${roomId}`;
    
    // Join room on backend
    socket.emit("join-room", { roomId, username, avatar: avatarUrl });
    
    // Load initial anime catalog
    loadCatalog(true);
    setupInfiniteScroll();
  }

  btnCopyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(roomId).then(() => {
      const originalIcon = btnCopyCode.innerHTML;
      btnCopyCode.innerHTML = '<i class="fa-solid fa-check" style="color: var(--accent-green);"></i>';
      setTimeout(() => {
        btnCopyCode.innerHTML = originalIcon;
      }, 1500);
    });
  });

  btnLeave.addEventListener('click', () => {
    if (confirm("¿Estás seguro de que deseas salir de la sala?")) {
      window.location.reload();
    }
  });

  // --- NAVIGATION (TABS ROUTING) ---
  function switchTab(tabName) {
    activeTab = tabName;
    
    // Toggles buttons
    btnTabCatalog.classList.toggle('active', tabName === 'catalog');
    btnTabCinema.classList.toggle('active', tabName === 'cinema');
    btnTabActivities.classList.toggle('active', tabName === 'activities');

    // Toggles panels
    panelCatalog.classList.toggle('active', tabName === 'catalog');
    panelCinema.classList.toggle('active', tabName === 'cinema');
    panelActivities.classList.toggle('active', tabName === 'activities');

    // Pause player if leaving cinema
    if (tabName !== 'cinema') {
      // We don't stop the video, we just let it run or pause depending on user needs.
      // But typically, to conserve CPU, we could pause, or let them listen in the background.
    }
    
    // Resize drawing canvas on tab switch to fit container properly
    if (tabName === 'activities') {
      resizeCanvas();
    }
  }

  btnTabCatalog.addEventListener('click', () => switchTab('catalog'));
  btnTabCinema.addEventListener('click', () => switchTab('cinema'));
  btnTabActivities.addEventListener('click', () => switchTab('activities'));

  // Right Sidebar Tabs
  function switchRightTab(tabName) {
    activeRightTab = tabName;
    tabBtnChat.classList.toggle('active', tabName === 'chat');
    tabBtnMembers.classList.toggle('active', tabName === 'members');
    tabContentChat.classList.toggle('active', tabName === 'chat');
    tabContentMembers.classList.toggle('active', tabName === 'members');
  }

  tabBtnChat.addEventListener('click', () => switchRightTab('chat'));
  tabBtnMembers.addEventListener('click', () => switchRightTab('members'));

  // Text channels toggles
  channelItems.forEach(item => {
    item.addEventListener('click', () => {
      channelItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      activeChannel = item.getAttribute('data-channel');
      chatTextarea.placeholder = `Escribe un mensaje en #${activeChannel}-chat...`;
      // Clear messages display and load specific ones (simple simulation - we filter active chat views)
      renderFilteredMessages();
    });
  });

  // --- DISCORD VOICE SIMULATION ---
  btnJoinVoice.addEventListener('click', () => {
    isVoiceConnected = !isVoiceConnected;
    if (isVoiceConnected) {
      btnJoinVoice.classList.add('connected');
      voiceConnectedStatus.textContent = "Conectado";
      voiceConnectedStatus.style.color = "var(--accent-green)";
    } else {
      btnJoinVoice.classList.remove('connected');
      voiceConnectedStatus.textContent = "Conectar";
      voiceConnectedStatus.style.color = "";
    }
    socket.emit("toggle-voice-state", { type: "connected", value: isVoiceConnected });
  });

  btnToggleMic.addEventListener('click', () => {
    isMuted = !isMuted;
    btnToggleMic.classList.toggle('active', isMuted);
    btnToggleMic.innerHTML = isMuted ? '<i class="fa-solid fa-microphone-slash"></i>' : '<i class="fa-solid fa-microphone"></i>';
    socket.emit("toggle-voice-state", { type: "mute", value: isMuted });
  });

  btnToggleDeafen.addEventListener('click', () => {
    isDeafened = !isDeafened;
    btnToggleDeafen.classList.toggle('active', isDeafened);
    btnToggleDeafen.innerHTML = isDeafened ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
    
    // Auto mute if deafened
    if (isDeafened && !isMuted) {
      isMuted = true;
      btnToggleMic.classList.add('active');
      btnToggleMic.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
      socket.emit("toggle-voice-state", { type: "mute", value: true });
    }
    socket.emit("toggle-voice-state", { type: "deafen", value: isDeafened });
  });

  // --- REAL-TIME CHAT & USER EVENTS ---
  let messagesList = [];

  function renderFilteredMessages() {
    chatMessages.innerHTML = '';
    const filtered = messagesList.filter(msg => msg.system || msg.channel === activeChannel);
    
    filtered.forEach(msg => {
      const msgDiv = document.createElement('div');
      
      if (msg.system) {
        msgDiv.className = 'chat-message system-msg';
        msgDiv.innerHTML = `
          <img src="${msg.avatar}" alt="Sys">
          <div class="message-content">
            <span class="message-text">${msg.text}</span>
          </div>
        `;
      } else {
        msgDiv.className = 'chat-message';
        msgDiv.innerHTML = `
          <img src="${msg.avatar}" alt="${msg.username}">
          <div class="message-content">
            <div class="message-header">
              <span class="message-user">${msg.username}</span>
              <span class="message-time">${msg.timestamp}</span>
            </div>
            <span class="message-text">${escapeHTML(msg.text)}</span>
          </div>
        `;
      }
      chatMessages.appendChild(msgDiv);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // Send message
  function sendMessage() {
    const text = chatTextarea.value.trim();
    if (!text) return;
    
    socket.emit("send-message", { text, channel: activeChannel });
    chatTextarea.value = "";
    chatTextarea.rows = 1;
    socket.emit("typing-status", { isTyping: false });
  }

  chatSendBtn.addEventListener('click', sendMessage);
  chatTextarea.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Typing status indicator
  let typingTimeout = null;
  chatTextarea.addEventListener('input', () => {
    socket.emit("typing-status", { isTyping: true });
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("typing-status", { isTyping: false });
    }, 1500);
  });

  // --- SOCKET LISTENERS ---
  socket.on("receive-message", (message) => {
    messagesList.push(message);
    renderFilteredMessages();
  });

  socket.on("user-typing", ({ socketId, username, isTyping }) => {
    if (isTyping) {
      typingIndicator.textContent = `${username} está escribiendo...`;
    } else {
      typingIndicator.textContent = "";
    }
  });

  socket.on("room-users-updated", (users) => {
    memberCount.textContent = users.length;
    renderMembersList(users);
    renderVoiceChannelUsers(users);
  });

  socket.on("room-state", ({ videoState, tictactoe, drawHistory }) => {
    // Set Host Status
    const me = roomsStateFindMe();
    if (me) {
      isHost = me.isHost;
    }

    // Sync drawing history
    if (drawHistory && drawHistory.length > 0) {
      drawHistory.forEach(line => drawCanvasLine(line));
    }

    // Sync Video if already playing
    if (videoState && videoState.streamUrl) {
      syncVideoState(videoState);
    }

    // Sync Tic-Tac-Toe state
    if (tictactoe) {
      renderTicTacToe(tictactoe);
    }
  });

  function roomsStateFindMe() {
    // Safe lookup is handled in the users list
    return null;
  }

  function renderMembersList(users) {
    membersList.innerHTML = '';
    users.forEach(u => {
      const item = document.createElement('div');
      item.className = 'member-item';
      
      const isMe = u.socketId === socket.id;
      const hostTag = u.isHost ? '<span class="host-badge">Host</span>' : '';
      const micStatus = u.isMuted ? '<i class="fa-solid fa-microphone-slash" style="color:#ff334b;"></i>' : '';
      const deafStatus = u.isDeafened ? '<i class="fa-solid fa-volume-xmark" style="color:#ff334b; margin-left:4px;"></i>' : '';

      item.innerHTML = `
        <img src="${u.avatar}" alt="${u.username}">
        <div class="member-details">
          <div class="member-name-row">
            <span class="member-name">${u.username} ${isMe ? '(tú)' : ''}</span>
            ${hostTag}
          </div>
          <span class="member-status">${u.isSpeaking ? 'Hablando' : 'Conectado'}</span>
        </div>
        <div class="member-actions">
          ${micStatus}
          ${deafStatus}
        </div>
      `;
      membersList.appendChild(item);
      
      if (isMe) {
        isHost = u.isHost;
      }
    });
  }

  function renderVoiceChannelUsers(users) {
    voiceUsersList.innerHTML = '';
    const voiceUsers = users.filter(u => !u.isDeafened || u.isSpeaking); // simple filter
    
    users.forEach(u => {
      // In our simple voice status, if they joined voice (say isVoiceConnected toggled)
      // For this UI, we show them as voice active if they are online.
      const item = document.createElement('div');
      item.className = 'voice-user-item';
      
      const speakClass = u.isSpeaking ? 'speaking-glow' : '';
      const muteIcon = u.isMuted ? '<i class="fa-solid fa-microphone-slash"></i>' : '<i class="fa-solid fa-microphone" style="color:var(--accent-green);"></i>';

      item.innerHTML = `
        <div class="voice-user-left">
          <img src="${u.avatar}" alt="${u.username}" class="${speakClass}">
          <span>${u.username}</span>
        </div>
        <div class="voice-user-icons">
          ${muteIcon}
        </div>
      `;
      voiceUsersList.appendChild(item);
    });
  }

  // --- ANIME EXPLORER (CATALOG & SEARCH) ---
  const API_KEY = "dev-anime1v-key"; // Accepted since DISABLE_AUTH is true
  
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
  });

  async function loadCatalog(resetGrid = true) {
    currentMode = 'catalog';
    
    if (catalogGenre) {
      viewTitle.textContent = `Género: ${catalogGenre.charAt(0).toUpperCase() + catalogGenre.slice(1)}`;
      viewSubtitle.textContent = `Explorando catálogo filtrado`;
    } else {
      viewTitle.textContent = "Catálogo Completo";
      viewSubtitle.textContent = "Explora anime de múltiples proveedores en tiempo real";
    }

    if (resetGrid) {
      catalogPage = 1;
      hasMorePages = true;
      showGridSkeletons();
    }

    try {
      let url = `/api/v1/anime/catalog?page=${catalogPage}`;
      if (catalogGenre) url += `&genre=${encodeURIComponent(catalogGenre)}`;
      
      const res = await fetch(url, { headers: getHeaders() });
      const responseData = await res.json();

      if (resetGrid) resultsGrid.innerHTML = '';

      if (responseData.success && responseData.data?.results?.length > 0) {
        appendAnimeCards(responseData.data.results);
        hasMorePages = responseData.data.hasMore;
        
        if (hasMorePages) {
          scrollSentinel.classList.add('visible');
        } else {
          scrollSentinel.classList.remove('visible');
        }
      } else {
        if (resetGrid) renderNoResults();
        hasMorePages = false;
        scrollSentinel.classList.remove('visible');
      }
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
      if (resetGrid) renderErrorView();
      scrollSentinel.classList.remove('visible');
    }
  }

  async function loadMoreCatalog() {
    if (isLoadingMore || !hasMorePages) return;
    isLoadingMore = true;
    catalogPage++;
    
    appendGridSkeletons(4);

    try {
      let url = `/api/v1/anime/catalog?page=${catalogPage}`;
      if (catalogGenre) url += `&genre=${encodeURIComponent(catalogGenre)}`;
      
      const res = await fetch(url, { headers: getHeaders() });
      const responseData = await res.json();

      removeSkeletons();

      if (responseData.success && responseData.data?.results?.length > 0) {
        appendAnimeCards(responseData.data.results);
        hasMorePages = responseData.data.hasMore;
      } else {
        hasMorePages = false;
      }

      if (!hasMorePages) scrollSentinel.classList.remove('visible');
    } catch (err) {
      console.error('Error al cargar más catálogo:', err);
      removeSkeletons();
      hasMorePages = false;
      scrollSentinel.classList.remove('visible');
    } finally {
      isLoadingMore = false;
    }
  }

  async function performSearch(query = '') {
    const q = query.trim();
    if (!q) return;

    currentMode = 'search';
    viewTitle.textContent = `Buscando "${q}"`;
    viewSubtitle.textContent = `Buscando en todos los proveedores en paralelo...`;
    showGridSkeletons();
    scrollSentinel.classList.remove('visible');

    try {
      const res = await fetch(`/api/v1/anime/search?q=${encodeURIComponent(q)}`, {
        headers: getHeaders()
      });
      const responseData = await res.json();

      if (responseData.success && responseData.data?.results?.length > 0) {
        viewSubtitle.textContent = `${responseData.data.count} resultados encontrados`;
        resultsGrid.innerHTML = '';
        appendAnimeCards(responseData.data.results);
      } else {
        renderNoResults();
      }
    } catch (err) {
      console.error('Error al realizar búsqueda:', err);
      renderErrorView();
    }
  }

  function appendAnimeCards(results) {
    results.forEach(anime => {
      const card = document.createElement('div');
      card.className = 'anime-card';
      
      const imageUrl = anime.image 
        ? `/api/v1/anime/image-proxy?url=${encodeURIComponent(anime.image)}` 
        : '';

      const imgTag = imageUrl
        ? `<img src="${imageUrl}" class="card-image" alt="${anime.title}" loading="lazy">`
        : `<div class="card-image" style="background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;padding:10px;text-align:center;">${anime.title}</div>`;

      card.innerHTML = `
        <div class="card-image-wrapper">
          ${imgTag}
          <span class="card-badge">${anime.provider || 'Multi'}</span>
        </div>
        <div class="card-content">
          <h4 class="card-title">${anime.title}</h4>
          <div class="card-meta">
            <span>${anime.type || 'Serie'}</span>
            <span>${anime.year || ''}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        loadAnimeDetail(anime.url);
      });

      resultsGrid.appendChild(card);
    });
  }

  function showGridSkeletons(count = 12) {
    resultsGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-card';
      resultsGrid.appendChild(skeleton);
    }
  }

  function appendGridSkeletons(count = 4) {
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-card';
      resultsGrid.appendChild(skeleton);
    }
  }

  function removeSkeletons() {
    document.querySelectorAll('.skeleton-card').forEach(s => s.remove());
  }

  function renderNoResults() {
    resultsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
        <i class="fa-solid fa-face-frown" style="font-size: 48px; margin-bottom: 16px; color: var(--accent-purple);"></i>
        <h3>No se encontraron resultados</h3>
        <p>Intenta buscar de otra manera o cambia los filtros.</p>
      </div>
    `;
  }

  function renderErrorView() {
    resultsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 48px; margin-bottom: 16px; color: #ff334b;"></i>
        <h3>Error al consultar la API</h3>
        <p>Los scrapers están respondiendo lento o se cayeron temporalmente. Reintenta más tarde.</p>
      </div>
    `;
  }

  // Infinite Scroll Observer Setup
  function setupInfiniteScroll() {
    if (infiniteObserver) infiniteObserver.disconnect();
    
    infiniteObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !isLoadingMore && hasMorePages && currentMode === 'catalog') {
          loadMoreCatalog();
        }
      }
    }, { rootMargin: '100px' });

    infiniteObserver.observe(scrollSentinel);
  }

  genreFilters.addEventListener('click', (e) => {
    const chip = e.target.closest('.genre-chip');
    if (!chip) return;
    
    document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    
    catalogGenre = chip.getAttribute('data-genre') || '';
    loadCatalog(true);
  });

  searchBtn.addEventListener('click', () => performSearch(searchInput.value));
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch(searchInput.value);
  });

  // --- ANIME DETAIL DIALOG ---
  async function loadAnimeDetail(animeUrl) {
    detailOverlay.style.display = 'flex';
    animeTitle.textContent = "Obteniendo info...";
    animeDescription.textContent = "Cargando sinopsis...";
    animePoster.style.backgroundImage = 'none';
    animeGenres.innerHTML = '';
    episodesGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding: 20px;">Obteniendo capítulos...</div>';

    try {
      const res = await fetch(`/api/v1/anime/info?url=${encodeURIComponent(animeUrl)}`, {
        headers: getHeaders()
      });
      const responseData = await res.json();

      if (responseData.success && responseData.data) {
        currentAnimeData = responseData.data;
        renderAnimeDetail(currentAnimeData);
      } else {
        animeTitle.textContent = "Error de Carga";
        animeDescription.textContent = "No se pudieron obtener los detalles de este anime.";
      }
    } catch (err) {
      console.error('Error detail:', err);
      animeTitle.textContent = "Error de red";
      animeDescription.textContent = "Falla de red al conectar al API backend.";
    }
  }

  function renderAnimeDetail(data) {
    animeTitle.textContent = data.title;
    animeDescription.textContent = data.description || "Sin descripción disponible.";
    animeType.textContent = data.type || "Anime";
    
    const posterUrl = data.image ? `/api/v1/anime/image-proxy?url=${encodeURIComponent(data.image)}` : '';
    animePoster.style.backgroundImage = posterUrl ? `url('${posterUrl}')` : 'none';

    animeGenres.innerHTML = '';
    if (data.genres) {
      data.genres.forEach(g => {
        const tag = document.createElement('span');
        tag.className = 'genre-tag';
        tag.textContent = g.name;
        animeGenres.appendChild(tag);
      });
    }

    episodesGrid.innerHTML = '';
    if (data.episodes && data.episodes.length > 0) {
      const sorted = [...data.episodes].sort((a,b) => parseFloat(a.number) - parseFloat(b.number));
      
      sorted.forEach(ep => {
        const epBlock = document.createElement('div');
        epBlock.className = 'episode-btn';
        
        epBlock.innerHTML = `
          <span style="font-weight:700; margin-bottom:4px;">Capítulo ${ep.number}</span>
          <div class="episode-actions-menu">
            <button class="episode-btn-action btn-group-sync" data-url="${ep.url}" data-number="${ep.number}">
              <i class="fa-solid fa-play"></i> Transmitir
            </button>
            <button class="episode-btn-action btn-solo" data-url="${ep.url}" data-number="${ep.number}">
              Ver Solo
            </button>
          </div>
        `;

        // Transmit together (Sync)
        epBlock.querySelector('.btn-group-sync').addEventListener('click', (e) => {
          e.stopPropagation();
          detailOverlay.style.display = 'none';
          playSharedEpisode(ep.url, ep.number);
        });

        // Watch solo (no sockets emitted)
        epBlock.querySelector('.btn-solo').addEventListener('click', (e) => {
          e.stopPropagation();
          detailOverlay.style.display = 'none';
          playLocalEpisode(ep.url, ep.number);
        });

        episodesGrid.appendChild(epBlock);
      });
    } else {
      episodesGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted);">No hay capítulos disponibles.</div>';
    }
  }

  btnCloseDetail.addEventListener('click', () => {
    detailOverlay.style.display = 'none';
  });

  detailOverlay.addEventListener('click', (e) => {
    if (e.target === detailOverlay) {
      detailOverlay.style.display = 'none';
    }
  });

  // --- SYNCHRONIZED PLAYER ACTIONS ---
  async function playSharedEpisode(episodeUrl, episodeNumber) {
    switchTab('cinema');
    playingTitle.textContent = currentAnimeData.title;
    playingSubtitle.textContent = `Preparando Episodio ${episodeNumber}...`;
    
    videoLoader.style.opacity = '1';
    videoLoader.style.pointerEvents = 'all';
    
    // Fetch episode links
    try {
      const res = await fetch(`/api/v1/anime/episode?url=${encodeURIComponent(episodeUrl)}`, {
        headers: getHeaders()
      });
      const responseData = await res.json();

      if (responseData.success && responseData.data?.servers?.sub) {
        const servers = responseData.data.servers.sub;
        
        // Find supported servers
        const supported = servers.filter(s => {
          const n = (s.server || '').toLowerCase() + ' ' + (s.url || '').toLowerCase();
          return n.includes('voe') || n.includes('wish') || n.includes('tape') || n.includes('playnix') || n.includes('medix') || n.includes('awish');
        });

        if (supported.length > 0) {
          // Resolve stream in parallel cascade
          videoLoader.querySelector('p').textContent = "Resolviendo enlace premium libre de anuncios...";
          const urls = supported.map(s => s.url);
          
          const resolveRes = await fetch(`/api/v1/anime/resolve?urls=${encodeURIComponent(JSON.stringify(urls))}`, {
            headers: getHeaders()
          });
          const resolveData = await resolveRes.json();

          if (resolveData.success && resolveData.streamUrl) {
            // We have a direct stream! Let's broadcast this to the whole room!
            socket.emit("video-state-change", {
              animeTitle: currentAnimeData.title,
              episodeNumber: episodeNumber,
              episodeUrl: episodeUrl,
              streamUrl: resolveData.streamUrl,
              mediaType: resolveData.mediaType,
              playing: true,
              time: 0,
              servers: servers
            });
            return;
          }
        }
        
        // Fallback: Broadcast the first iframe url
        if (servers.length > 0) {
          socket.emit("video-state-change", {
            animeTitle: currentAnimeData.title,
            episodeNumber: episodeNumber,
            episodeUrl: episodeUrl,
            streamUrl: servers[0].url,
            mediaType: "iframe",
            playing: true,
            time: 0,
            servers: servers
          });
        }
      } else {
        alert("No se pudieron resolver servidores de streaming para este capítulo.");
        videoLoader.style.opacity = '0';
        videoLoader.style.pointerEvents = 'none';
      }
    } catch (err) {
      console.error(err);
      videoLoader.style.opacity = '0';
      videoLoader.style.pointerEvents = 'none';
    }
  }

  // Play Locally (No sockets / solo watch)
  async function playLocalEpisode(episodeUrl, episodeNumber) {
    switchTab('cinema');
    playingTitle.textContent = currentAnimeData.title + " (Privado)";
    playingSubtitle.textContent = `Cargando Episodio ${episodeNumber} en modo solo...`;
    
    videoLoader.style.opacity = '1';
    videoLoader.style.pointerEvents = 'all';
    
    try {
      const res = await fetch(`/api/v1/anime/episode?url=${encodeURIComponent(episodeUrl)}`, {
        headers: getHeaders()
      });
      const responseData = await res.json();

      if (responseData.success && responseData.data?.servers?.sub) {
        const servers = responseData.data.servers.sub;
        renderCinemaServers(servers, false);

        const supported = servers.filter(s => {
          const n = (s.server || '').toLowerCase() + ' ' + (s.url || '').toLowerCase();
          return n.includes('voe') || n.includes('wish') || n.includes('tape') || n.includes('playnix') || n.includes('medix') || n.includes('awish');
        });

        if (supported.length > 0) {
          const urls = supported.map(s => s.url);
          const resolveRes = await fetch(`/api/v1/anime/resolve?urls=${encodeURIComponent(JSON.stringify(urls))}`, {
            headers: getHeaders()
          });
          const resolveData = await resolveRes.json();

          if (resolveData.success && resolveData.streamUrl) {
            setupVideoSource(resolveData.streamUrl, resolveData.mediaType, servers[0]?.url);
            videoLoader.style.opacity = '0';
            videoLoader.style.pointerEvents = 'none';
            playingSubtitle.textContent = `Streaming Directo (${resolveData.server}) — Cap ${episodeNumber}`;
            return;
          }
        }
        
        // Iframe play
        loadCinemaIframe(servers[0].url);
        videoLoader.style.opacity = '0';
        videoLoader.style.pointerEvents = 'none';
      }
    } catch (err) {
      console.error(err);
      videoLoader.style.opacity = '0';
      videoLoader.style.pointerEvents = 'none';
    }
  }

  // Sync Listeners
  socket.on("video-sync-state", (state) => {
    isSyncingPlayback = true;
    syncVideoState(state);
    
    // Show quick alert
    showSyncNotice(`Sincronización recibida: Cap ${state.episodeNumber}`);
    setTimeout(() => {
      isSyncingPlayback = false;
    }, 1000);
  });

  function showSyncNotice(text) {
    syncNoticeText.textContent = text;
    syncNoticeOverlay.style.display = 'block';
    setTimeout(() => {
      syncNoticeOverlay.style.display = 'none';
    }, 2000);
  }

  function syncVideoState(state) {
    switchTab('cinema');
    playingTitle.textContent = state.animeTitle;
    playingSubtitle.textContent = `Sincronizado: Episodio ${state.episodeNumber}`;
    currentEpisodeNumber = state.episodeNumber;

    if (state.servers) {
      renderCinemaServers(state.servers, true);
    }

    if (state.mediaType === 'iframe') {
      loadCinemaIframe(state.streamUrl);
      videoLoader.style.opacity = '0';
      videoLoader.style.pointerEvents = 'none';
    } else {
      const iframe = document.getElementById('iframe-player');
      if (iframe) iframe.remove();
      mainPlayer.style.display = 'block';

      // Setup source
      setupVideoSource(state.streamUrl, state.mediaType);
      
      // Update play state
      if (Math.abs(mainPlayer.currentTime - state.time) > 2) {
        mainPlayer.currentTime = state.time;
      }
      
      if (state.playing) {
        mainPlayer.play().catch(() => {});
      } else {
        mainPlayer.pause();
      }
      videoLoader.style.opacity = '0';
      videoLoader.style.pointerEvents = 'none';
    }

    setupCinemaNavControls(state.episodeUrl, state.episodeNumber);
  }

  function setupCinemaNavControls(episodeUrl, episodeNumber) {
    if (currentAnimeData && currentAnimeData.episodes) {
      const eps = [...currentAnimeData.episodes].sort((a,b) => parseFloat(a.number) - parseFloat(b.number));
      const current = parseFloat(episodeNumber);
      const idx = eps.findIndex(e => parseFloat(e.number) === current);

      playerPrevBtn.disabled = idx <= 0;
      playerNextBtn.disabled = idx === -1 || idx >= eps.length - 1;

      playerPrevBtn.onclick = () => {
        const prev = eps[idx - 1];
        playSharedEpisode(prev.url, prev.number);
      };

      playerNextBtn.onclick = () => {
        const next = eps[idx + 1];
        playSharedEpisode(next.url, next.number);
      };
    }
  }

  // Monitor play/pause/seek events to emit synchronization details
  mainPlayer.addEventListener('play', () => {
    if (isSyncingPlayback) return;
    socket.emit("video-state-change", {
      playing: true,
      time: mainPlayer.currentTime
    });
  });

  mainPlayer.addEventListener('pause', () => {
    if (isSyncingPlayback) return;
    socket.emit("video-state-change", {
      playing: false,
      time: mainPlayer.currentTime
    });
  });

  // Seek detection with throttling
  let seekTimeout = null;
  mainPlayer.addEventListener('seeking', () => {
    if (isSyncingPlayback) return;
    clearTimeout(seekTimeout);
    seekTimeout = setTimeout(() => {
      socket.emit("video-state-change", {
        time: mainPlayer.currentTime,
        playing: !mainPlayer.paused
      });
    }, 400);
  });

  // Force Sync Button click
  playerSyncForce.addEventListener('click', () => {
    socket.emit("request-sync");
    showSyncNotice("Solicitando sincronía al Host...");
  });

  // Handle host state reporting
  socket.on("request-host-playback-time", ({ requesterId }) => {
    if (isHost) {
      socket.emit("respond-sync", {
        requesterId,
        time: mainPlayer.currentTime,
        playing: !mainPlayer.paused
      });
    }
  });

  function setupVideoSource(url, mediaType, fallbackUrl) {
    stopActivePlayback();
    mainPlayer.style.display = 'block';

    if (fallbackUrl) {
      playerExternalBtn.style.display = 'flex';
      playerExternalBtn.href = fallbackUrl;
    } else {
      playerExternalBtn.style.display = 'none';
    }

    if (mediaType === 'hls') {
      if (Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(mainPlayer);
      } else if (mainPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        mainPlayer.src = url;
      }
    } else {
      mainPlayer.src = url;
    }
  }

  function loadCinemaIframe(url) {
    stopActivePlayback();
    mainPlayer.style.display = 'none';
    
    playerExternalBtn.style.display = 'flex';
    playerExternalBtn.href = url;

    const iframe = document.createElement('iframe');
    iframe.id = 'iframe-player';
    iframe.src = url;
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.setAttribute('allowfullscreen', 'true');

    document.getElementById('video-container').appendChild(iframe);
  }

  function stopActivePlayback() {
    mainPlayer.pause();
    mainPlayer.removeAttribute('src');
    mainPlayer.load();

    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    const iframe = document.getElementById('iframe-player');
    if (iframe) iframe.remove();
  }

  function renderCinemaServers(servers, shared = true) {
    serversList.innerHTML = '';
    servers.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'server-btn';
      btn.textContent = s.server;

      btn.addEventListener('click', async () => {
        // Resolve this specific server
        videoLoader.style.opacity = '1';
        videoLoader.style.pointerEvents = 'all';
        videoLoader.querySelector('p').textContent = `Resolviendo ${s.server}...`;
        
        try {
          const res = await fetch(`/api/v1/anime/resolve?url=${encodeURIComponent(s.url)}`, {
            headers: getHeaders()
          });
          const responseData = await res.json();

          videoLoader.style.opacity = '0';
          videoLoader.style.pointerEvents = 'none';

          if (responseData.success && responseData.streamUrl) {
            if (shared) {
              socket.emit("video-state-change", {
                streamUrl: responseData.streamUrl,
                mediaType: responseData.mediaType,
                playing: true,
                time: 0
              });
            } else {
              setupVideoSource(responseData.streamUrl, responseData.mediaType, s.url);
            }
          } else {
            // Load iframe
            if (shared) {
              socket.emit("video-state-change", {
                streamUrl: s.url,
                mediaType: "iframe",
                playing: true,
                time: 0
              });
            } else {
              loadCinemaIframe(s.url);
            }
          }
        } catch (err) {
          console.error(err);
          videoLoader.style.opacity = '0';
          videoLoader.style.pointerEvents = 'none';
        }
      });
      serversList.appendChild(btn);
    });
  }

  // --- COLLABORATIVE DRAWING BOARD ---
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let brushColor = "#8a2be2";
  let brushSize = 5;

  function resizeCanvas() {
    // Keep canvas drawing buffer matching its screen bounding client rect
    const rect = paintCanvas.getBoundingClientRect();
    
    // Save drawing context
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = paintCanvas.width;
    tempCanvas.height = paintCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(paintCanvas, 0, 0);

    paintCanvas.width = rect.width;
    paintCanvas.height = rect.height;

    // Restore drawing context
    ctx.drawImage(tempCanvas, 0, 0, paintCanvas.width, paintCanvas.height);
    
    // Canvas context settings get reset when width/height change
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  // Window resize observer
  window.addEventListener('resize', () => {
    if (activeTab === 'activities') {
      resizeCanvas();
    }
  });

  // Canvas Mouse events
  paintCanvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const rect = paintCanvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
  });

  paintCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    
    const rect = paintCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const drawData = {
      x0: lastX / paintCanvas.width,
      y0: lastY / paintCanvas.height,
      x1: x / paintCanvas.width,
      y1: y / paintCanvas.height,
      color: brushColor,
      size: brushSize
    };

    drawCanvasLine(drawData);
    socket.emit("draw-line", drawData);

    lastX = x;
    lastY = y;
  });

  paintCanvas.addEventListener('mouseup', () => isDrawing = false);
  paintCanvas.addEventListener('mouseleave', () => isDrawing = false);

  // Touch support for mobiles
  paintCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    isDrawing = true;
    const rect = paintCanvas.getBoundingClientRect();
    lastX = e.touches[0].clientX - rect.left;
    lastY = e.touches[0].clientY - rect.top;
  });

  paintCanvas.addEventListener('touchmove', (e) => {
    if (!isDrawing || e.touches.length !== 1) return;
    e.preventDefault();
    
    const rect = paintCanvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    const drawData = {
      x0: lastX / paintCanvas.width,
      y0: lastY / paintCanvas.height,
      x1: x / paintCanvas.width,
      y1: y / paintCanvas.height,
      color: brushColor,
      size: brushSize
    };

    drawCanvasLine(drawData);
    socket.emit("draw-line", drawData);

    lastX = x;
    lastY = y;
  });

  paintCanvas.addEventListener('touchend', () => isDrawing = false);

  function drawCanvasLine({ x0, y0, x1, y1, color, size }) {
    ctx.beginPath();
    ctx.strokeStyle = color === "eraser" ? "#1a1a24" : color;
    ctx.lineWidth = size;
    ctx.moveTo(x0 * paintCanvas.width, y0 * paintCanvas.height);
    ctx.lineTo(x1 * paintCanvas.width, y1 * paintCanvas.height);
    ctx.stroke();
  }

  // Sockets canvas draw listener
  socket.on("draw-line-broadcast", (drawData) => {
    drawCanvasLine(drawData);
  });

  socket.on("clear-canvas-broadcast", () => {
    ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  });

  btnClearCanvas.addEventListener('click', () => {
    ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    socket.emit("clear-canvas");
  });

  brushSizeInput.addEventListener('input', (e) => {
    brushSize = e.target.value;
  });

  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      brushColor = dot.getAttribute('data-color');
    });
  });

  // --- MULTIPLAYER TIC-TAC-TOE ---
  let mySymbol = null; // 'X' | 'O' | 'spectator'

  btnJoinTtt.addEventListener('click', () => {
    socket.emit("tictactoe-join");
  });

  btnResetTtt.addEventListener('click', () => {
    socket.emit("tictactoe-reset");
  });

  tttCells.forEach(cell => {
    cell.addEventListener('click', () => {
      const index = cell.getAttribute('data-idx');
      socket.emit("tictactoe-move", { index });
    });
  });

  socket.on("tictactoe-assigned", (symbol) => {
    mySymbol = symbol;
    if (symbol === "spectator") {
      btnJoinTtt.style.display = 'none';
      tttStatus.textContent = "Modo Espectador";
    } else {
      btnJoinTtt.style.display = 'none';
      tttStatus.textContent = `Eres el Jugador: ${symbol}`;
    }
  });

  socket.on("tictactoe-state", (ttt) => {
    // Render cells
    tttCells.forEach(cell => {
      const idx = cell.getAttribute('data-idx');
      const symbol = ttt.board[idx];
      cell.textContent = symbol || "";
      cell.setAttribute('data-symbol', symbol || "");
    });

    // Reset button display
    btnResetTtt.style.display = 'inline-block';

    // Join button display
    const isPlayer = mySymbol === 'X' || mySymbol === 'O';
    if (!isPlayer) {
      btnJoinTtt.style.display = (!ttt.players.X || !ttt.players.O) ? 'block' : 'none';
    }

    // Status text render
    if (ttt.status === "waiting") {
      tttStatus.textContent = "Esperando que se una el segundo jugador...";
      tttStatus.style.background = "rgba(0, 240, 255, 0.1)";
      tttStatus.style.color = "var(--accent-blue)";
    } else if (ttt.status === "playing") {
      const turnSymbol = ttt.turn;
      const isMyTurn = mySymbol === turnSymbol;
      tttStatus.textContent = isMyTurn ? "¡Es tu turno!" : `Turno del jugador ${turnSymbol}`;
      tttStatus.style.background = isMyTurn ? "rgba(57, 255, 20, 0.1)" : "rgba(255, 255, 255, 0.05)";
      tttStatus.style.color = isMyTurn ? "var(--accent-green)" : "var(--text-main)";
    } else if (ttt.status === "won") {
      const winner = ttt.turn; // The player who just moved
      const didIWin = mySymbol === winner;
      tttStatus.textContent = didIWin ? "¡FELICIDADES! ¡GANASTE!" : `¡El jugador ${winner} ha ganado!`;
      tttStatus.style.background = didIWin ? "rgba(57, 255, 20, 0.15)" : "rgba(255, 0, 127, 0.15)";
      tttStatus.style.color = didIWin ? "var(--accent-green)" : "var(--accent-pink)";
    } else if (ttt.status === "draw") {
      tttStatus.textContent = "¡Empate!";
      tttStatus.style.background = "rgba(255, 255, 255, 0.1)";
      tttStatus.style.color = "var(--text-muted)";
    }
  });
});
