document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const status = document.getElementById('status');
    const moviesDiv = document.getElementById('moviesList');
    const torrentsDiv = document.getElementById('torrentsList');
    const playerContainer = document.getElementById('playerContainer');
    const videoPlayer = document.getElementById('videoPlayer');
    const playerStatus = document.getElementById('playerStatus');
    const playerTitle = document.getElementById('playerTitle');
    const backBtn = document.getElementById('backBtn');
    
    let client = null;

    searchBtn.addEventListener('click', searchMovies);
    backBtn.addEventListener('click', () => {
        if (client) { client.destroy(); client = null; }
        videoPlayer.src = ''; videoPlayer.load();
        playerContainer.style.display = 'none';
        moviesDiv.style.display = 'flex';
        torrentsDiv.style.display = 'flex';
        status.textContent = 'Выберите фильм заново.';
    });

    async function searchMovies() {
        const query = searchInput.value.trim();
        if (!query) return;

        status.textContent = 'Ищем...';
        moviesDiv.innerHTML = ''; torrentsDiv.style.display = 'none';
        playerContainer.style.display = 'none'; moviesDiv.style.display = 'flex';

        try {
            const res = await fetch(`https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}&limit=10`);
            const data = await res.json();
            
            if (!data.data || !data.data.movies) {
                status.textContent = 'Ничего не найдено.';
                return;
            }

            status.textContent = `Найдено: ${data.data.movies.length}`;
            data.data.movies.forEach(m => {
                const card = document.createElement('div');
                card.className = 'movie-card';
                card.textContent = m.title + ' (' + m.year + ')';
                card.onclick = () => loadTorrents(m.id, m.title);
                moviesDiv.appendChild(card);
            });
                } catch (e) { 
            status.textContent = 'Ошибка: ' + e.message; 
            console.error(e); 
        }
    }

    async function loadTorrents(id, title) {
        moviesDiv.style.display = 'none'; torrentsDiv.style.display = 'flex';
        torrentsDiv.innerHTML = ''; status.textContent = `Загрузка: ${title}...`;

        try {
            const res = await fetch(`https://yts.mx/api/v2/movie_details.json?movie_id=${id}`);
            const data = await res.json();

            if (!data.data || !data.data.movie || !data.data.movie.torrents) {
                status.textContent = 'Торренты не найдены.';
                return;
            }

            const torrents = data.data.movie.torrents;
            torrents.sort((a, b) => b.seeds - a.seeds);

            torrents.forEach(t => {
                const row = document.createElement('div');
                row.className = 'torrent-row';
                row.innerHTML = `
                    <div style="flex:1">
                        <span class="badge quality">${t.quality}</span>
                        <span style="color:#888;margin-left:10px">${t.size}</span>
                    </div>
                    <div style="display:flex;gap:15px;align-items:center">
                        <span class="badge seeds">🌱 ${t.seeds} / 👥 ${t.peers}</span>
                        <button class="play-btn">Смотреть</button>
                    </div>
                `;
                row.querySelector('.play-btn').onclick = () => playTorrent(t.url, title);
                torrentsDiv.appendChild(row);
            });
        } catch (e) { status.textContent = 'Ошибка торрентов.'; }
    }

    function playTorrent(url, title) {
        torrentsDiv.style.display = 'none'; moviesDiv.style.display = 'none';
        playerContainer.style.display = 'block'; playerTitle.textContent = title;
        playerStatus.textContent = 'Загрузка торрента...';

        if (client) client.destroy();
        client = new WebTorrent();

        client.add(url, (torrent) => {
            playerStatus.textContent = 'Буферизация...';
            const file = torrent.files.reduce((a, b) => a.length > b.length ? a : b);
            file.renderTo(videoPlayer, { autoplay: true });
        });

        client.on('error', (err) => { playerStatus.textContent = 'Ошибка: ' + err.message; });
    }
});
