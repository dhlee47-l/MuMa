const APIController = (function () {

    const _getToken = async () => {
        const result = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                // client id, secret key
                'Authorization': 'Basic ' + btoa('724a3cf2d2e44418acea58d9eea869af' + ':' + '5d9c76ea66784592853696aa94fdd310')
            },
            body: 'grant_type=client_credentials'
        });

        const data = await result.json();
        return data.access_token;
    }

    const _getGenres = async (token) => {
        const result = await fetch(`https://api.spotify.com/v1/browse/categories?locale=sv_KR`, {
            method: 'GET',
            headers: {'Authorization': 'Bearer ' + token}
        });

        const data = await result.json();
        return data.categories.items;
    }

    const _getPlaylistByGenre = async (token, genreId) => {
        const limit = 20;
        const result = await fetch(`https://api.spotify.com/v1/browse/categories/${genreId}/playlists?limit=${limit}`, {
            method: 'GET',
            headers: {'Authorization': 'Bearer ' + token}
        });

        const data = await result.json();
        return data.playlists.items;
    }

    const _getTracks = async (token, tracksEndPoint) => {
        const limit = 20;
        const result = await fetch(`${tracksEndPoint}?limit=${limit}`, {
            method: 'GET',
            headers: {'Authorization': 'Bearer ' + token}
        });

        const data = await result.json();
        return data.items.filter(item => item.track.preview_url !== null);
    }

    const _getTrack = async (token, trackEndPoint) => {
        const result = await fetch(`${trackEndPoint}`, {
            method: 'GET',
            headers: {'Authorization': 'Bearer ' + token}
        });

        const data = await result.json();
        return data;
    }

    return {
        getToken() {
            return _getToken();
        },
        getGenres(token) {
            return _getGenres(token);
        },
        getPlaylistByGenre(token, genreId) {
            return _getPlaylistByGenre(token, genreId);
        },
        getTracks(token, tracksEndPoint) {
            return _getTracks(token, tracksEndPoint);
        },
        getTrack(token, trackEndPoint) {
            return _getTrack(token, trackEndPoint);
        }
    }
})();

const UIController = (function() {
    const DOMElements = {
        selectGenre: '#select_genre',
        selectPlaylist: '#select_playlist',
        buttonSubmit: '#btn_submit',
        divSongDetail: '#song-detail',
        hfToken: '#hidden_token',
        divSonglist: '.song-list',
        searchSection: '#search-section',
        comingSoonSection: '#coming-soon-section',
        goBackButton: '#go-back-button',
    }

    return {
        inputField() {
            return {
                genre: document.querySelector(DOMElements.selectGenre),
                playlist: document.querySelector(DOMElements.selectPlaylist),
                tracks: document.querySelector(DOMElements.divSonglist),
                submit: document.querySelector(DOMElements.buttonSubmit),
                songDetail: document.querySelector(DOMElements.divSongDetail),
            }
        },

        createGenre(text, value) {
            const html = `<option value="${value}">${text}</option>`;
            document.querySelector(DOMElements.selectGenre).insertAdjacentHTML('beforeend', html);
        },

        createPlaylist(text, value) {
            const html = `<option value="${value}">${text}</option>`;
            document.querySelector(DOMElements.selectPlaylist).insertAdjacentHTML('beforeend', html);
        },

        resetTrackDetail() {
            this.inputField().songDetail.innerHTML = '';
        },

        resetTracks() {
            this.inputField().tracks.innerHTML = '';
            this.resetTrackDetail();
        },

        resetPlaylist() {
            this.inputField().playlist.innerHTML = '<option>Keyword</option>';
            this.resetTracks();
        },

        storeToken(value) {
            document.querySelector(DOMElements.hfToken).value = value;
        },

        getStoredToken() {
            return {
                token: document.querySelector(DOMElements.hfToken).value
            }
        },

        showComingSoon() {
            document.querySelector(DOMElements.searchSection).style.display = 'none';
            document.querySelector(DOMElements.comingSoonSection).style.display = 'block';
        },

        hideComingSoon() {
            document.querySelector(DOMElements.searchSection).style.display = 'block';
            document.querySelector(DOMElements.comingSoonSection).style.display = 'none';
        },

        getDOMElements() {
            return DOMElements;
        }
    }
})();

const APPController = (function (UICtrl, APICtrl) {

    const DOMInputs = UICtrl.inputField();
    const DOMElements = UICtrl.getDOMElements();

    const loadGenres = async () => {
        const token = await APICtrl.getToken();
        UICtrl.storeToken(token);
        const genres = await APICtrl.getGenres(token);
        genres.forEach(element => UICtrl.createGenre(element.name, element.id));
    }

    document.querySelector(DOMElements.goBackButton).addEventListener('click', () => {
        UICtrl.hideComingSoon();
        DOMInputs.genre.selectedIndex = 0;
        UICtrl.resetPlaylist();
    });

    DOMInputs.genre.addEventListener('change', async () => {
        UICtrl.resetPlaylist();
        const token = UICtrl.getStoredToken().token;
        const genreSelect = UICtrl.inputField().genre;
        const genreId = genreSelect.options[genreSelect.selectedIndex].value;
        try {
            const playlists = await APICtrl.getPlaylistByGenre(token, genreId);

            if (!playlists || playlists.length === 0) {
                UICtrl.showComingSoon();
                return;
            }

            UICtrl.hideComingSoon();
            playlists.forEach(p => UICtrl.createPlaylist(p.name, p.tracks.href));
        } catch (error) {
            console.error('Error fetching playlists:', error);
            UICtrl.showComingSoon();
        }
    });

    DOMInputs.submit.addEventListener('click', async (e) => {
        e.preventDefault();
        UICtrl.resetTracks();

        const token = UICtrl.getStoredToken().token;
        const playlistSelect = UICtrl.inputField().playlist;
        const tracksEndPoint = playlistSelect.options[playlistSelect.selectedIndex].value;

        const tracks = await APICtrl.getTracks(token, tracksEndPoint);

        const trackData = tracks.map(el => ({
            id: el.track.href,
            name: el.track.name,
            artist: el.track.artists[0].name,
            albumImage: el.track.album.images[0].url,
            previewUrl: el.track.preview_url
        }));

        localStorage.setItem('trackData', JSON.stringify(trackData));

        window.location.href = 'quiz.html';
    });

    DOMInputs.tracks.addEventListener('click', async (e) => {
        e.preventDefault();
        UICtrl.resetTrackDetail();
        const token = UICtrl.getStoredToken().token;
        const trackEndpoint = e.target.id;
        const track = await APICtrl.getTrack(token, trackEndpoint);
        UICtrl.createTrackDetail(track.album.images[0].url, track.name, track.artists[0].name, track.preview_url);
    });

    return {
        init() {
            loadGenres();
            UICtrl.hideComingSoon();
        }
    }

})(UIController, APIController);

APPController.init();

