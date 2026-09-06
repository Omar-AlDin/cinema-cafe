'use strict'

const BASE_URL = 'https://bold-wood-ed55.o01604672.workers.dev/api';

const options = {
    method: 'GET',
    headers: {
        accept: 'application/json',

    }
};

//React refactor: Add dynamic Trending badge based on popularity/trending criteria. Also add for new criteria

//Variables
const mediaState = {
    backdrops: [],
    videos: [],
    posters: [],
    popular: []
}

//Filter
const currentFilters = {
    sortBy: 'popularity.desc',
    genre: '',
    minRating: '',
    year: '',
    language: ''
}

const currentFiltersTv = {
    sortBy: 'popularity.desc',
    genre: '',
    minRating: '',
    year: '',
    language: ''
}

// DOM
const moviePageContainer = document.querySelector('.page-container')
const movieGrid = document.querySelector('.movies-grid')
const tvGrid = document.querySelector('.tv-grid')
const totalPages = 50;
const seenMovie = new Set();
const seenTV = new Set();
const genreContainer = document.querySelectorAll('.genres');

let currentFetchController = null;

let numberOfPages = 0



//Infinite scrolling
let currentPage = 1;
let isLoading = false;
let pagePause = 5;
const loadButton = document.getElementById('load-more-btn');
const sentinel = document.getElementById('scroll-sentinel');


//Storage Session Movies & TV
if (movieGrid) {
    movieGrid.addEventListener('click', function (e) {
        if (!e.target.closest('.poster-link')) return;
        saveGridState('movieGrid:' + location.search, movieGrid, {
            page: currentPage,
            pagePause,
            numberOfPages,
            seen: Array.from(seenMovie),
            filters: currentFilters
        });
    });
}


if (tvGrid) {
    tvGrid.addEventListener('click', function (e) {
        if (!e.target.closest('.poster-link')) return;
        saveGridState('tvGrid:' + location.search, tvGrid, {
            page: currentTvPage,
            pagePause: tvPagePause,
            numberOfPages: numberOfTvPages,
            seen: Array.from(seenTV),
            filters: currentFiltersTv
        });
    });
}


const checkSentinel = function () {
    if (!sentinel || isLoading || currentPage >= totalPages) return;

    const rect = sentinel.getBoundingClientRect();
    const inView = rect.top < window.innerHeight + 300; // mirrors your rootMargin
    if (numberOfPages <= currentPage) return;
    if (inView) {

        if (currentPage < pagePause) {
            currentPage++;
            fetchMovies(currentPage).then(checkSentinel); // recheck after render
        } else {
            if (loadButton) loadButton.style.display = 'block';
        }
    }
};


const observerOptions = {
    root: null,
    rootMargin: '300px', // Loads 300px BEFORE reaching the bottom of the page
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting)
            checkSentinel();
    });

},
    observerOptions
);

if (sentinel) observer.observe(sentinel);

if (loadButton) {
    loadButton.addEventListener('click', function () {
        loadButton.style.display = 'none';
        currentPage++
        pagePause += 5;
        fetchMovies(currentPage)

    });

}


//Session Storage
const STATE_PREFIX = 'gatto:';

const saveGridState = function (key, container, extra = {}) {
    if (!container) return;
    try {
        sessionStorage.setItem(STATE_PREFIX + key, JSON.stringify({
            html: container.innerHTML,
            scrollY: window.scrollY,
            savedAt: Date.now(),
            ...extra
        }));
    } catch (err) {
        console.warn(`Could not save scroll state: ${err.message}`)
    }
}

const loadGridState = function (key, maxAgeMs = 30 * 60 * 1000) {
    try {
        const raw = sessionStorage.getItem(STATE_PREFIX + key)
        if (!raw) return null;
        const state = JSON.parse(raw);
        if (Date.now() - state.savedAt > maxAgeMs) return null;
        return state;
    } catch (err) {
        return null;
    }
}

const clearGridState = function (key) {
    sessionStorage.removeItem(STATE_PREFIX + key);
}

const restoreScroll = function (y) {
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
}


//Parama
const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id') || '4232'
const keywordParam = urlParams.get('keyword');
const labelParam = urlParams.get('label');
const sortParam = urlParams.get('sort');
const voteCount = urlParams.get('vote_count.gte');
const sortSelect = document.querySelector('#select-sort');

if (keywordParam) {
    currentFilters.keyword = keywordParam;
}


const handleFilter = function () {
    if (currentFetchController) {
        currentFetchController.abort();
    }
    currentFetchController = new AbortController();
    clearGridState('movieGrid:' + location.search);

    if (movieGrid) movieGrid.innerHTML = '';
    seenMovie.clear();
    currentPage = 1;
    if (loadButton) loadButton.style.display = 'none';
    pagePause = 5


    fetchMovies(currentPage).then(checkSentinel)
}

if (sortParam) {
    currentFilters.sortBy = sortParam;
}



if (sortSelect && sortParam) {
    sortSelect.value = sortParam;
}


const hiddenGems = [
    { id: 968, type: 'movie' },
    { id: 306947, type: 'movie' },
    { id: 5876, type: 'movie' },
    { id: 769364, type: 'movie' },
    { id: 393184, type: 'movie' },
    { id: 742, type: 'movie' },
    { id: 34435, type: 'tv' },
    { id: 117978, type: 'movie' },
    { id: 204223, type: 'tv' },
    { id: 159037, type: 'movie' },
    { id: 21484, type: 'movie' },
    { id: 10294, type: 'movie' },
    { id: 44156, type: 'tv' },
    { id: 1698999, type: 'movie' }

]

// const minVotes = currentFilters
//Movies
const fetchMovies = async function (page = 1) {

    if (isLoading) return
    isLoading = true;

    const signal = currentFetchController ? currentFetchController.signal : undefined;
    // console.log("Signal", signal)
    try {
        const isArabic = currentFilters.language === "ar";

        const minVote = isArabic ? 5 : (currentFilters.keyword ? 5 : voteCount);
        const effectiveMinRating = currentFilters.minRating || (isArabic ? '5.5' : '');

        let movieUrl = `${BASE_URL}/discover/movie?sort_by=${currentFilters.sortBy}&page=${page}&vote_count.gte=${minVote}&include_adult=false`;
        // const effective

        if (currentFilters.genre) {
            movieUrl += `&with_genres=${currentFilters.genre}`;
        }
        if (currentFilters.keyword) {
            movieUrl += `&with_keywords=${currentFilters.keyword}`;
        }
        if (currentFilters.year) {
            movieUrl += `&primary_release_year=${currentFilters.year}`;
        }
        if (currentFilters.minRating) {
            movieUrl += `&vote_average.gte=${effectiveMinRating}`;
        }
        if (currentFilters.language) {
            movieUrl += `&with_original_language=${currentFilters.language}`;
        }


        const res = await fetch(movieUrl, { ...options, signal });
        if (!res.ok) throw new Error(`HTTP error! ${res.status}`);
        const movieData = await res.json();


        if (!movieData) return;

        numberOfPages = movieData.total_pages
        movieData.results.forEach(item => {
            if (!item.poster_path) return
            if (seenMovie.has(item.id)) return
            seenMovie.add(item.id)
            const link = document.createElement('a');
            link.href = `movie-details.html?id=${item.id}`
            link.classList.add('poster-link');
            const image = document.createElement('img');
            image.src = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
            image.alt = item.title;
            image.draggable = false;
            link.draggable = false;
            link.append(image);

            if (movieGrid) movieGrid.append(link);

        })

        // console.log(movieData)


    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('Fetch aborted due to filter change.');
            return;
        }
        console.error(`Something went wrong: ${err.message}`)
    } finally {
        isLoading = false;
    }
}

const isBackForwardNavigation = function () {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
        return navEntries[0].type === 'back_forward';
    }
    return false; // fallback if the API isn't available
};

const syncMovieFilterUI = function () {
    if (sortSelect) sortSelect.value = currentFilters.sortBy;
    const genreSelect = document.querySelector('#genre-select');
    if (genreSelect) genreSelect.value = currentFilters.genre;
    const yearSelect = document.querySelector('#year-sort');
    if (yearSelect) yearSelect.value = currentFilters.year;
    const ratingSelect = document.querySelector('#rating-select');
    if (ratingSelect) ratingSelect.value = currentFilters.minRating;
    const languageSelect = document.querySelector('#language-select');
    if (languageSelect) languageSelect.value = currentFilters.language;
};

if (movieGrid) {
    if (isBackForwardNavigation()) {
        const saved = loadGridState('movieGrid:' + location.search);
        if (saved) {
            Object.assign(currentFilters, saved.filters);
            movieGrid.innerHTML = saved.html;
            currentPage = saved.page;
            pagePause = saved.pagePause;
            numberOfPages = saved.numberOfPages;
            seenMovie.clear();
            saved.seen.forEach(id => seenMovie.add(id));
            if (currentPage >= pagePause && loadButton) loadButton.style.display = 'block';
            restoreScroll(saved.scrollY);
            checkSentinel(); // resume infinite scroll from where it left off
        } else {
            fetchMovies(currentPage).then(checkSentinel);
        }
    } else {
        clearGridState('movieGrid:' + location.search); // fresh nav — wipe stale snapshot
        fetchMovies(currentPage).then(checkSentinel);
    }
}


//Genre fetch
const genresMovies = async function () {
    const genreSelect = document.querySelector('#genre-select');

    if (!genreSelect) return;
    try {
        const genreRes = await fetch(`${BASE_URL}/genre/movie/list`, options);
        if (!genreRes.ok) throw new Error(`HTTP response failed: ${genreRes.status}`);
        const genreData = await genreRes.json();

        // console.log("Genre Data", genreData)
        genreData.genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.id;
            option.textContent = genre.name;
            genreSelect.append(option);
        })
    } catch (err) {
        console.log(`Something went wrong: ${err.message}`)
    }

}
genresMovies().then(syncMovieFilterUI);

// Movies Filter Apply
document.querySelector('#select-sort')?.addEventListener('change', function (e) {
    e.preventDefault();
    currentFilters.sortBy = e.target.value;
    handleFilter();

})

document.querySelector('#year-sort')?.addEventListener('change', function (e) {
    currentFilters.year = e.target.value;
    handleFilter();
})

document.querySelector('#genre-select')?.addEventListener('change', function (e) {
    currentFilters.genre = e.target.value;
    handleFilter();
});

document.querySelector('#rating-select')?.addEventListener('change', function (e) {
    currentFilters.minRating = e.target.value;
    handleFilter();
});

document.querySelector('#language-select')?.addEventListener('change', function (e) {
    currentFilters.language = e.target.value;
    handleFilter();
});





// ----------------TV Shows--------------
const tvBtn = document.getElementById('tv-load-btn');
const tvsentinel = document.getElementById('scroll-sentinel-tv');
let currentTvPage = 1;
let tvTotalPages = 60;
let isTvLoading = false;
let tvPagePause = 5;
let numberOfTvPages = 0
let currentFetchControllerTv = null;

const checkSentinelTv = function () {
    if (!tvsentinel || isTvLoading || currentTvPage >= tvTotalPages) return;

    const rect = tvsentinel.getBoundingClientRect();
    const inView = rect.top < window.innerHeight + 300; // mirrors your rootMargin
    if (numberOfTvPages <= currentTvPage) return;
    if (inView) {

        if (currentTvPage <= tvPagePause) {
            currentTvPage++;
            tvImage(currentTvPage).then(checkSentinelTv); // recheck after render
        } else {
            if (tvBtn) tvBtn.style.display = 'block';
        }
    }
};


const observerTv = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting)
            checkSentinelTv();
    });

},
    observerOptions
);

if (tvsentinel) observerTv.observe(tvsentinel)

if (tvBtn) {
    tvBtn.addEventListener('click', function () {
        tvBtn.style.display = 'none';
        currentTvPage++
        tvPagePause += 5;
        tvImage(currentTvPage)

    });

}

const handleFilterTv = function () {
    clearGridState('tvGrid:' + location.search);

    if (currentFetchControllerTv) {
        currentFetchControllerTv.abort();
    }
    currentFetchControllerTv = new AbortController();
    if (tvGrid) tvGrid.innerHTML = '';
    seenTV.clear();
    currentTvPage = 1;
    if (tvBtn) tvBtn.style.display = 'none';
    tvPagePause = 5


    tvImage(currentTvPage).then(checkSentinelTv)
}

const tvImage = async function (page = 1) {


    if (isTvLoading) return
    isTvLoading = true;

    const signal = currentFetchControllerTv ? currentFetchControllerTv.signal : undefined;

    try {

        const isArabic = currentFiltersTv.language === "ar";
        const minVote = isArabic ? 2 : 50;

        const effectiveRating = currentFiltersTv.minRating || (isArabic ? '5.5' : '');
        if (!tvGrid) throw new Error("Movies is currenlty displayed")
        let tvUrl = `${BASE_URL}/discover/tv?sort_by=${currentFiltersTv.sortBy}&page=${page}&vote_count.gte=${minVote}&include_adult=false`;


        if (currentFiltersTv.genre) {
            tvUrl += `&with_genres=${currentFiltersTv.genre}`;
        }
        if (currentFiltersTv.year) {
            tvUrl += `&first_air_date_year=${currentFiltersTv.year}`;
        }
        if (currentFiltersTv.minRating) {
            tvUrl += `&vote_average.gte=${effectiveRating}`;
        }
        if (currentFiltersTv.language) {
            tvUrl += `&with_original_language=${currentFiltersTv.language}`;
        }


        const tvRes = await fetch(tvUrl, { ...options, signal });
        if (!tvRes.ok) throw new Error(`HTTP response went wrong: ${tvRes.status}`)
        const tvData = await tvRes.json();
        // console.log("TV Data", tvData);

        numberOfTvPages = tvData.total_pages;

        tvData.results.forEach(item => {
            if (!item.poster_path) return;
            if (seenTV.has(item.id)) return
            seenTV.add(item.id);
            const link = document.createElement('a');
            link.href = `tv-details.html?id=${item.id}`;
            link.classList.add('poster-link');
            const image = document.createElement('img');
            image.src = `https://image.tmdb.org/t/p/w500${item.poster_path}`
            image.alt = item.title
            link.append(image)
            link.draggable = false;
            image.draggable = false;
            tvGrid.append(link);

        })

    } catch (err) {
        console.error(`Something went wrong: ${err.message}`)
    } finally {
        isTvLoading = false;
    }
}


//Load Session Grid


const syncTvFilterUI = function () {
    const tvSortSelect = document.querySelector('#tv-select-sort');
    if (tvSortSelect) tvSortSelect.value = currentFiltersTv.sortBy;
    const tvGenreSelect = document.querySelector('#tv-genre-select');
    if (tvGenreSelect) tvGenreSelect.value = currentFiltersTv.genre;
    const tvYearSelect = document.querySelector('#tv-year-sort');
    if (tvYearSelect) tvYearSelect.value = currentFiltersTv.year;
    const tvRatingSelect = document.querySelector('#tv-rating-select');
    if (tvRatingSelect) tvRatingSelect.value = currentFiltersTv.minRating;
    const tvLanguageSelect = document.querySelector('#tv-language-select');
    if (tvLanguageSelect) tvLanguageSelect.value = currentFiltersTv.language;
};

if (tvGrid) {
    if (isBackForwardNavigation()) {
        const savedTv = loadGridState('tvGrid:' + location.search);
        if (savedTv) {
            Object.assign(currentFiltersTv, savedTv.filters);
            tvGrid.innerHTML = savedTv.html;
            currentTvPage = savedTv.page;
            tvPagePause = savedTv.pagePause;
            numberOfTvPages = savedTv.numberOfPages;
            seenTV.clear();
            savedTv.seen.forEach(id => seenTV.add(id));
            if (currentTvPage >= tvPagePause && tvBtn) tvBtn.style.display = 'block';
            restoreScroll(savedTv.scrollY);
            checkSentinelTv();
        } else {
            tvImage().then(checkSentinelTv);
        }
    } else {
        clearGridState('tvGrid:' + location.search);
        tvImage().then(checkSentinelTv);
    }
}


const genresTv = async function () {
    const genreSelect = document.querySelector('#tv-genre-select');
    if (!genreSelect) return;
    try {
        const genreRes = await fetch(`${BASE_URL}/genre/tv/list`, options);
        const genreData = await genreRes.json();
        if (!genreRes.ok) throw new Error(`HTTP response went wrong: ${genreRes.status}`)
        // console.log("Genre Data", genreData)
        genreData.genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.id;
            option.textContent = genre.name;
            genreSelect.append(option);
        })
    } catch (err) {
        console.error(`Something went wrong: ${err.message}`)
    }

}

genresTv().then(syncTvFilterUI);
// TV Shows Filter Apply
document.querySelector('#tv-select-sort')?.addEventListener('change', function (e) {
    e.preventDefault();
    currentFiltersTv.sortBy = e.target.value;
    handleFilterTv();

})

document.querySelector('#tv-year-sort')?.addEventListener('change', function (e) {
    currentFiltersTv.year = e.target.value;
    handleFilterTv();
})

document.querySelector('#tv-genre-select')?.addEventListener('change', function (e) {
    currentFiltersTv.genre = e.target.value;
    handleFilterTv();
});

document.querySelector('#tv-rating-select')?.addEventListener('change', function (e) {
    currentFiltersTv.minRating = e.target.value;
    handleFilterTv();
});

document.querySelector('#tv-language-select')?.addEventListener('change', function (e) {
    currentFiltersTv.language = e.target.value;
    handleFilterTv();
});


// --------------- Details Page -------------------------

const setAllText = (selector, text) => {
    document.querySelectorAll(selector).forEach(el => el.textContent = text);
};

const hideAll = (selector) => {
    document.querySelectorAll(selector).forEach(el => el.classList.add('hidden'))
}

const showAll = (selector) => {
    document.querySelectorAll(selector).forEach(el => el.classList.remove('hidden'))
}

const setTagline = function (taglineText) {
    document.querySelectorAll('.tagline').forEach(el => {
        if (taglineText) {
            el.textContent = taglineText;
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
};

//Image URL Function
const imageUrl = (path, size = 'original') =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : 'placeholder.jpg';





// DOM Function
const backdropImageTv = document.querySelector('.backdrop-tv')
const backdropImage = document.querySelector('.backdrop');
const posterImage = document.querySelector('.poster');
const actorsContainer = document.querySelector('.cast-list');
const status = document.querySelector('.status');
// const releaseYear = document.querySelector('#release-year')
if (posterImage) hideAll('.poster');
// const cerEl = document.querySelector('#movie-certification')
// const runTime = document.querySelector('#runtime')
const tagline = document.querySelector('.tagline')
const overview = document.querySelector('.overview')
// const title = document.querySelector('#title')


const renderDetails = function (movie) {

    setAllText('.js-title', movie.title);

    // const rating = document.querySelector('#movie-rating')
    setAllText('.js-movie-rating', movie.vote_average.toFixed(1) || "N/A");


    setAllText('.js-release-year', movie.release_date.split('-')[0]);

    //Certificate
    const relDates = movie.release_dates?.results?.find(item => item.iso_3166_1 === movie.origin_country[0])
    const certificate = relDates?.release_dates?.find(cer => cer.certification != '')?.certification;


    setAllText('.js-movie-certification', certificate || 'N/A');


    setAllText('.js-runtime', (movie.runtime / 60).toFixed(0) + "h" + ' ' + (movie.runtime % 60) + "m");

    setTagline(movie.tagline);

    if (overview) setAllText('.overview', movie.overview || "");




    const movieReleaseDate = movie.release_date;

    if (!movieReleaseDate) {
        document.querySelector('#tab-title').textContent = `${movie.title} | Cinema Cafe`;
    } else {
        document.querySelector('#tab-title').textContent = `${movie.title} (${movie.release_date.split('-')[0]}) | Cinema Cafe`;
    }


    //Genre pills

    const renderGenrePills = function (genre) {
        genreContainer.forEach(container => {
            container.innerHTML = '';
            genre.forEach(el => {
                const pill = document.createElement('span');
                pill.classList.add('genre-pill');
                pill.textContent = el.name
                container.append(pill);
            });
        });
    }
    renderGenrePills(movie.genres);

    //Cast
    if (actorsContainer) {
        const actors = movie.credits?.cast?.slice(0, 9) || [];

        actorsContainer.innerHTML = '';

        actors.forEach(act => {
            const attore = document.createElement('div');
            attore.classList.add('cast-member');

            const profileImage = imageUrl(act.profile_path, 'w185');

            attore.innerHTML =
                `<img src=${profileImage} alt="${act.name}" class = "cast-image">
                <div class=actor-name-character>
<h4 class="actor-name">${act.name}</h4>
        <p class="character-name">${act.character}</p>
        </div>
        `;

            actorsContainer.append(attore)
            // console.log("attore", attore)
        });

        const viewMoreBtn = document.createElement('button');
        viewMoreBtn.classList.add('btn-view-more', 'btn-view-more-mobile');
        viewMoreBtn.textContent = "View More →";
        actorsContainer.append(viewMoreBtn);

    }
    //--------Crew---------
    //Writers
    const writing = movie.credits?.crew?.filter(dep => dep.department === "Writing") || [];

    const uniqueNames = writing?.filter((person, index, arr) => arr.findIndex(p => p.id === person.id) === index);
    const writerNames = uniqueNames.map(na => na.name).join(', ')

    document.querySelector('#writer-span').textContent = writerNames || "N/A";

    //Directors
    const director = movie.credits?.crew?.filter(d => d.job === "Director") || [];

    const uniqueDirectors = director.filter(
        (person, index, arr) => arr.findIndex(p => p.id === person.id) === index);

    const directorNames = uniqueDirectors.map(n => n.name).join(', ');
    document.querySelector('#director-span').textContent = directorNames || "N/A";


}



const creatorTv = document.querySelector('#creator-span');
// const ratingTv = document.querySelector('.rating-tv');
//-------Rrender TV Shows------------
const isTv = window.location.pathname.includes('tv-details.html');
// const dota = document.querySelector('.dot-time');
const seasonScroller = document.querySelector('.season-scroller');
const today = new Date();

// console.log(isTv)
const renderDetailsTv = function (tv) {
    if (!tv || tv.success == false) return;
    document.querySelectorAll('.poster').forEach(el => el.src = imageUrl(tv.poster_path));
    showAll('.poster')

    const tvDate = tv.first_air_date;
    const releaseDate = new Date(tvDate);

    if (!tvDate) {
        document.querySelector('#tab-title').textContent = `${tv.name} | Cinema Cafe`;
    } else {
        document.querySelector('#tab-title').textContent = `${tv.name} (${tv.first_air_date.split('-')[0]}) | Cinema Cafe`;
    }
    const creator = tv.created_by.map(create => create.name).join(', ');
    creatorTv.textContent = creator || "N/A";
    setAllText('.rating-tv', tv.vote_average.toFixed(1));


    //Genres
    const genrePills = function (genre) {
        genreContainer.forEach(container => {
            container.innerHTML = '';
            genre.forEach(el => {
                const pill = document.createElement('span');
                pill.classList.add('genre-pill');
                pill.textContent = el.name
                container.append(pill);
            });
            container.classList.remove('hidden');
        });
    }

    genrePills(tv.genres);

    //release year
    function releaseYearRage(tv) {
        if (!tv.first_air_date) {
            setAllText('.js-release-year', "N/A");
            return;
        }


        const startYear = tv.first_air_date.split('-')[0];
        const isEnded = tv.status === "Ended" || tv.status === "Canceled";

        if (isEnded) {
            const endYear = tv.last_air_date ? tv.last_air_date.split('-')[0] : 'Unknown';

            if (!endYear || startYear === endYear) {
                setAllText('.js-release-year', `${startYear}`);
                return;
            }
            setAllText('.js-release-year', `${startYear} – ${endYear}`);
            return;

        }
        setAllText('.js-release-year', `${startYear} –`);
        return;
    }

    releaseYearRage(tv)


    //certification
    const rating = tv.content_ratings?.results || [];
    const certification = rating?.find(c => c.iso_3166_1 === tv.origin_country[0]) || rating?.find(c => c.iso_3166_1 === 'US') || rating[0];
    setAllText('.js-tv-certification', certification?.rating || "N/A");


    //runtime
    let runTimes = tv.episode_run_time[0];
    if (!runTimes) {
        runTimes = tv.last_episode_to_air?.runtime || tv.next_episode_to_air?.runtime
    }

    if (runTimes) {
        setAllText('.js-runtime', `${runTimes}m`);
    } else {
        // setAllDisplay('.js-runtime', 'none');

        document.querySelectorAll('.dot-time').forEach(el => {
            el.style.display = 'none'
        });
    }


    if (trailerButton) showAll('.btn-trailer');



    if (releaseDate <= today) {
        setAllText('.date-label', "Release Date:")
        setAllText('.date-span', formatedDateOnly(tv.first_air_date) || "N/A");
        setAllText('.origin-country', formatedCountry(tv.origin_country[0]) || "N/A");
        status.classList.remove('hidden')


    } else {
        setAllText('.date-label', "Coming Soon")
        setAllText('.date-span', formatedDateOnly(tv.first_air_date) || "N/A");
        setAllText('.origin-country', formatedCountry(tv.origin_country[0]) || "N/A");
        ratingSpan.classList.add('hidden');
        status.classList.remove('hidden');
        hideAll('.episode')
        showAll('.upcoming');
        hideAll('.rating')
        hideAll('.star-inline-details')

    }

    hiddenGems.forEach(item => {
        if (item.id === tv.id && item.type === 'tv') {
            showAll('.gem');
        }
    });


    setTagline(tv.tagline);
    setAllText('.overview', tv.overview);

    if (actorsContainer) {
        const actors = tv.credits?.cast?.slice(0, 9) || [];
        actorsContainer.innerHTML = '';

        actors.forEach(act => {
            const attore = document.createElement('div');
            attore.classList.add('cast-member');

            const profileImage = imageUrl(act.profile_path, 'w185');

            attore.innerHTML =
                `<img src=${profileImage} alt="${act.name}" class = "cast-image">
            <h4 class="actor-name">${act.name}</h4>
            <p class="character-name">${act.character}</p>`;

            actorsContainer.append(attore)
        });

        const viewMoreBtn = document.createElement('button');
        viewMoreBtn.classList.add('btn-view-more', 'btn-view-more-mobile');
        viewMoreBtn.textContent = "View More →";
        actorsContainer.append(viewMoreBtn);

    };

    setAllText('.language-span', formatedLanguage(tv.original_language));

    setAllText('.js-title', tv.original_name);

    document.querySelector('.next-episode').textContent = nextEpisode(tv.next_episode_to_air?.air_date);


    //number of episodes
    const totalEpisodes = tv.seasons?.reduce((acc, curr) => {
        return curr.season_number > 0 ? acc + curr.episode_count : acc;
    }, 0) || 0;

    setAllText('.total-episodes-span', totalEpisodes)


    // networks
    const netSpan = document.querySelector('.networks');
    const network = tv.networks?.map(net => net.name).join(', ');
    if (network) {
        setAllText('.networks-span', network);
    } else {
        netSpan.style.display = 'none';
    };


    setAllText('.total-season-span', tv.number_of_seasons);


}


let currentShowId = null;
const seasonEpi = document.querySelector('.season-episodes');
// const seasonBtn = document.querySelectorAll('.season-btn');


const renderSeasonBtn = function (tv) {
    seasonScroller.innerHTML = '';

    const firstRealSeason = tv.seasons.find(s => s.season_number > 0);
    tv.seasons.forEach(sea => {
        if (sea.season_number === 0) return
        const seasonBtn = document.createElement('button');
        seasonBtn.classList.add('season-btn');
        seasonBtn.textContent = `S${sea.season_number}`;
        if (firstRealSeason && sea.season_number === firstRealSeason.season_number) {
            seasonBtn.classList.add('active');
        }



        seasonBtn.addEventListener('click', () => {
            const isActive = seasonBtn.classList.contains('active');
            const episodesContainer = document.querySelector('.collapse');
            if (isActive) {

                episodesContainer.classList.toggle('hidden');

            } else {
                document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
                seasonBtn.classList.add('active');
                episodesContainer.classList.remove('hidden');

                loadSeason(currentShowId, sea.season_number);
            }

        });
        seasonScroller.append(seasonBtn);

    });

    //auto select first season episode
    if (firstRealSeason) loadSeason(currentShowId, firstRealSeason.season_number)
}





const loadSeason = async function (tvId = 113962, season = 1) {
    if (!seasonEpi) return;
    seasonEpi.innerHTML = '<p>Loading episodes....</p>';
    try {
        const seasonUrl = `${BASE_URL}/tv/${tvId}/season/${season}`
        const seasonRes = await fetch(seasonUrl, options);
        if (!seasonRes.ok) throw new Error(`HTTP error: ${seasonRes.status}`);
        const seasonData = await seasonRes.json();
        renderEpisode(seasonData);
        // console.log("season data", seasonData);

    } catch (err) {
        console.error(`Something went wrong: ${err.message}`)
    }
}

const renderEpisode = function (seasonData) {
    seasonEpi.innerHTML = '';
    const episodes = seasonData.episodes || [];
    episodes.forEach(ep => {
        const image = ep.still_path ? imageUrl(ep.still_path, 'w500') : 'placeholder.jpg';
        const rating = ep.vote_average ? ep.vote_average.toFixed(1) : 'N/A';
        const runtimeText = ep.runtime ? `<span class="dotta">•</span> ${ep.runtime}m` : '';

        seasonEpi.insertAdjacentHTML('beforeend', `
        <div class = "episode-card">
<img class = "episode-still" src = "${image}" alt= "${ep.name}">
<div class = "episode-info">
<div class = "episode-header">
<span class = "episode-number">${ep.episode_number}</span>
<span class="star-inline-details"><i data-lucide="star" class="star-icon-details star-episode"></i></span>
<span class = "episode-rating">${rating}</span>
<span class = "episode-name"> ${ep.name} </span>
</div>

<div class="episode-date-main">
<p class = "episode-date"> ${nextEpisode(ep.air_date)} ${runtimeText}</p>
</div>

<div class="episode-overview-main">
<p class = "episode-overview"> ${ep.overview || 'No overview available'}</p>
</div>

</div>
        </div>
        `
        );

    });
    lucide.createIcons();

}

//Fomrated Date Function
const MONTHS = {
    '01': 'January', '02': 'February', '03': 'March', '04': 'April',
    '05': 'May', '06': 'June', '07': 'July', '08': 'August',
    '09': 'September', '10': 'October', '11': 'November', '12': 'December'
};

const formatedDate = function (date, origin) {
    if (!date && !origin)
        return "N/A"

    const [year, month, day] = date.split('-');

    const monthNum = MONTHS[month] || month;

    const country = new Intl.DisplayNames(['en'], { type: 'region' })

    try {
        return `${monthNum} ${day}, ${year} (${country.of(origin)})`
    } catch (e) {
        if (origin) {
            country.toUpperCase();
        }
    }

}

const formatedCountry = function (origin) {
    if (!origin) return "N/A";

    const country = new Intl.DisplayNames(['en'], { type: 'region' })
    return `${country.of(origin)}`

}


const formatedDateOnly = function (date) {
    if (!date)
        return "N/A"

    const [year, month, day] = date.split('-');

    const monthNum = MONTHS[month] || month;

    const country = new Intl.DisplayNames(['en'], { type: 'region' })


    return `${monthNum} ${day}, ${year}`

}

//Next Episode
const nextEpisode = function (date) {
    if (!date) {
        document.querySelector('.episode').style.display = 'none'
        return;
    }
    const [year, month, day] = date.split('-');

    const monthNum = MONTHS[month] || month;

    const country = new Intl.DisplayNames(['en'], { type: 'region' })

    try {
        return `${monthNum} ${day}, ${year}`
    } catch (e) {
        country.toUpperCase();
    }

}

//Formated Currency & Numbers Function
const formatedCurrency = function (curr) {
    if (!curr) return 'N/A';

    const currency = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    });
    return currency.format(curr);
}



//Formated Poster and Backdrop Function
const formatedImage = function (movie) {
    return {
        backdrop: imageUrl(movie.backdrop_path),
        poster: imageUrl(movie.poster_path || movie.profile_path || 'placeholder.jpg')

    }
}

//Formated Language Function
const formatedLanguage = function (lan) {
    if (!lan) return 'N/A'
    const lang = new Intl.DisplayNames(['en'], { type: 'language' });
    try {
        return lang.of(lan)
    } catch (e) {
        lan.toUpperCase();
    }
}


if (status) status.classList.add('hidden')

const dateLabel = document.querySelector('.date-label');
const dateSpan = document.querySelector('.date-span');
const DateItem = document.querySelector('.date');
const budgetAndRevenue = document.querySelector('.budget-revenue')
const ratingSpan = document.querySelector('.rating');


const spans = function (movie) {
    document.querySelectorAll('.poster').forEach(el => el.src = imageUrl(movie.poster_path));
    document.querySelectorAll('.poster').forEach(el => el.alt = `${movie.original_title} Poster`);

    const movieDate = movie.release_date;
    const releaseDate = new Date(movieDate);
    const today = new Date();
    // console.log(releaseDate, today)
    if (releaseDate <= today) {
        setAllText('.date-label', "Release Date:");
        setAllText('.date-span', formatedDateOnly(movie.release_date) || "N/A");
        setAllText('.origin-country', formatedCountry(movie.origin_country[0]) || "N/A");

    } else {

        setAllText('.date-label', "Coming Soon");
        setAllText('.date-span', formatedDateOnly(movie.release_date) || "N/A");
        setAllText('.origin-country', formatedCountry(movie.origin_country[0]) || "N/A");
        budgetAndRevenue.classList.add('hidden');
        hideAll('.budget-revenue')
        showAll('.upcoming');
        hideAll('.rating');
        hideAll('.star-inline-details')
        hideAll('.revenue')

    }

    hiddenGems.forEach(item => {
        if (item.id === movie.id && item.type === 'movie') {
            showAll('.gem');
        }
    });

    setAllText('.language-span', formatedLanguage(movie.original_language));
    setAllText('.budget-span', formatedCurrency(movie.budget));
    setAllText('.revenue-span', formatedCurrency(movie.revenue) || "N/A");

    posterImage.onload = function () {
        showAll('.poster');
        status.classList.remove('hidden');
        showAll('.btn-trailer');
        showAll('.genres');
    };
};

let curentMovieId = null;
//----Media assets fetch
const mediaAsset = async function (movieId) {
    curentMovieId = movieId;
    const mediaType = isTv ? 'tv' : 'movie';
    const imagesUrl = `${BASE_URL}/${mediaType}/${movieId}/images`;
    const videosUrl = `${BASE_URL}/${mediaType}/${movieId}/videos`;

    try {
        const [imageRes, videoRes] = await Promise.all([
            fetch(imagesUrl, options),
            fetch(videosUrl, options)
        ]);
        if (!imageRes.ok) throw new Error(`HTTP Error ${imageRes.status}`);
        if (!videoRes.ok) throw new Error(`HTTP Error ${videoRes.status}`);
        const imageData = await imageRes.json();
        const videoData = await videoRes.json();

        // console.log("ImageData", imageData)
        // console.log("VideoData", videoData)

        mediaState.backdrops = imageData.backdrops || [];
        mediaState.posters = imageData.posters || [];
        mediaState.videos = videoData.results || [];

        return true;
    } catch (err) {
        console.error(`Error fetching media assets: ${err.message}`);
        document.querySelector('.media-scroll').innerHTML = `
<div class="media-error">
<p>Unable to load trailers and photos.</p>
<button onclick="retryMedia()">Retry Media</button>
</div>
`
        return false;
    }
}


const retryMedia = async function () {
    if (curentMovieId) {
        const ok = await mediaAsset(curentMovieId);
        if (ok) {
            renderPopular();
            setActive(mostPopular);
        }
    }
}

const media = document.querySelector('.media-scroll');


//Render Backdrops
const createBackdrops = function (backdrop, limit = 10) {

    return backdrop.slice(0, limit).map(back => {
        const img = document.createElement('img');
        img.classList.add('media-container');
        img.src = imageUrl(back.file_path, 'w780')
        img.alt = "Backdrop";
        return img;
    });

};

//Render Videos
const createVideos = function (videos, limit = 6) {
    // console.log(filtered)
    return videos.slice(0, limit).map(video => {
        const vid = document.createElement('iframe')
        vid.classList.add('media-container')
        vid.src = `https://www.youtube.com/embed/${video.key}`;

        vid.allowFullscreen = true;
        vid.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        vid.style.border = "none"; // Clean edge styling
        vid.title = video.name;
        return vid;
    });
}

// console.log("Create Videos", createVideos(mediaState.videos))



const renderBackdrops = function (backdrops) {
    media.innerHTML = '';
    createBackdrops(backdrops).forEach(back => media.append(back));
}

const renderVideos = function (vids) {
    media.innerHTML = '';
    createVideos(vids).forEach(vid => media.append(vid))
}



const renderPopular = function () {
    media.innerHTML = '';
    const popularVids = createVideos(mediaState.videos, 1);
    const backdrops = createBackdrops(mediaState.backdrops, 2);
    const popularPosters = createBackdrops(mediaState.posters, 1);
    const all = [...popularVids, ...backdrops, ...popularPosters]

    all.forEach(el => media.append(el));
    mediaState.popular = all;



}

//Media nav bar
const mediaButtons = document.querySelectorAll('.media-nav button');

const setActive = function (clickedBtn) {
    mediaButtons.forEach(btn => btn.classList.remove('active'));
    clickedBtn.classList.add('active')
}



//---------------Search-------------

const searchInput = document.querySelector('.input-search');
const searchResults = document.querySelector('.search-results');
const searchLoadBtn = document.querySelector('#search-load-more-btn');
const searchSentinel = document.querySelector('#search-sentinel');


let currentSearchPage = 1;
let isSearchLoading = false;
let searchPagePause = 5;
let numberOfSearchPages = 0
let currentSearchController = null;
let currentQuery = '';
const seenSearch = new Set();


//Search Session Storage
if (searchResults) {
    searchResults.addEventListener('click', function (e) {
        if (!e.target.closest('.poster-link')) return;
        saveGridState('search', searchResults, {
            query: currentQuery,
            page: currentSearchPage,
            pagePause: searchPagePause,
            numberOfPages: numberOfSearchPages,
            seen: Array.from(seenSearch)
        });
    });
}

const savedSearch = loadGridState('search');
if (savedSearch && searchInput) {
    searchInput.value = savedSearch.query;
    currentQuery = savedSearch.query;
    searchResults.innerHTML = savedSearch.html;
    currentSearchPage = savedSearch.page;
    searchPagePause = savedSearch.pagePause;
    numberOfSearchPages = savedSearch.numberOfPages;
    savedSearch.seen.forEach(id => seenSearch.add(id));
    if (currentSearchPage >= searchPagePause && searchLoadBtn) searchLoadBtn.style.display = 'block';
    restoreScroll(savedSearch.scrollY);
}



let searchId = null;
const fetchSearch = async function (query, page = 1) {
    searchId = query;
    if (isSearchLoading) return;
    isSearchLoading = true;

    const signal = currentSearchController ? currentSearchController.signal : undefined;
    try {
        const searchUrl = `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=${page}&include_adult=false`
        const searchRes = await fetch(searchUrl, { ...options, signal });
        if (!searchRes.ok) throw new Error(`HTTP response error ${searchRes.status}`);
        const searchData = await searchRes.json();
        numberOfSearchPages = searchData.total_pages;
        searchData.results.forEach(item => {
            if (item.media_type !== 'movie' && item.media_type !== 'tv') return;
            if (!item.poster_path) return;
            if (seenSearch.has(item.id + item.media_type)) return;
            seenSearch.add(item.id + item.media_type);

            let detailsPage;
            let displayTitle;
            if (item.media_type === 'tv') {
                detailsPage = 'tv-details.html';
                displayTitle = item.name;
            } else if (item.media_type === 'movie') {
                detailsPage = 'movie-details.html';
                displayTitle = item.title

            }
            // else if(item.known_for_department === "Acting"){
            //     detailsPage = 'profile.html';
            // }
            const link = document.createElement('a');
            link.href = `${detailsPage}?id=${item.id}`;
            link.classList.add('poster-link');
            const image = document.createElement('img');
            image.src = imageUrl(item.poster_path, 'w500');
            image.alt = displayTitle;
            link.append(image);
            image.draggable = false;
            link.draggable = false;
            if (searchResults) searchResults.append(link);
            return true;

        })



    } catch (err) {
        if (err.name === 'AbortError') {
            // console.log('Search aborted due to new query.');
            return;
        }
        console.error(`Error fetching search results: ${err.message}`);
        searchResults.innerHTML = `
        <div class="search-error">
        <p>Unable to load search results. Please check your internet connection</p>
        </div>`
        if (searchLoadBtn) searchLoadBtn.style.display = 'none';
        return false;
    } finally {
        isSearchLoading = false;
    }
}


const observerSearch = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) checkSearchSentinel();
    });
}, observerOptions);

if (searchSentinel) observerSearch.observe(searchSentinel);

if (searchLoadBtn) {
    searchLoadBtn.addEventListener('click', () => {
        searchLoadBtn.style.display = 'none';
        currentSearchPage++;
        searchPagePause += 5;
        fetchSearch(currentQuery, currentSearchPage);
    });
}


const checkSearchSentinel = function () {
    if (!searchSentinel || !currentQuery || isSearchLoading) return;
    if (currentSearchPage >= numberOfSearchPages) return

    const rect = searchSentinel.getBoundingClientRect();
    const inView = rect.top < window.innerHeight + 300;

    if (inView) {
        if (currentSearchPage < searchPagePause) {
            currentSearchPage++
            fetchSearch(currentQuery, currentSearchPage).then(ok => {
                if (ok !== false) checkSearchSentinel();
            });

        } else {
            if (searchLoadBtn) searchLoadBtn.style.display = 'block';

        }
    }
};

const runSearch = function (query) {
    if (currentSearchController) currentSearchController.abort();
    currentSearchController = new AbortController();

    currentQuery = query.trim();
    if (searchResults) searchResults.innerHTML = '';
    seenSearch.clear();
    currentSearchPage = 1;
    searchPagePause = 5;
    if (searchLoadBtn) searchLoadBtn.style.display = 'none';
    if (!currentQuery) return;

    fetchSearch(currentQuery, currentSearchPage).then(checkSearchSentinel);
};

let searchDebounceTimer = null;
if (searchInput) {
    searchInput.addEventListener('input', function (e) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            runSearch(e.target.value)
        }, 400);
    });
}

// -------- Main details page API ----------
const detailsImage = async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id') || '4232'
    try {
        if (isTv) {
            const tvUrl = `${BASE_URL}/tv/${movieId}?append_to_response=credits,content_ratings`;
            currentShowId = movieId;

            const tvRes = await fetch(tvUrl, options);
            const tvData = await tvRes.json();
            // console.log("TV Data", tvData)
            if (!tvRes.ok) throw new Error(`HTTP request went wrong: ${tvRes.status}`);

            if (backdropImageTv) {

                backdropImageTv.src = imageUrl(tvData.backdrop_path)
                backdropImageTv.alt = `${tvData.name} Backdrop`;
                document.querySelector('.ambient-glow').style.setProperty('--glow-image', `url(${imageUrl(tvData.backdrop_path)})`)
            }
            renderDetailsTv(tvData)
            const mediaOk = await mediaAsset(movieId);
            if (mediaOk) {
                renderPopular();
                setActive(mostPopular);
            }
            renderSeasonBtn(tvData);
            trailerName(tvData);

        } else if (moviePageContainer) {
            // console.log("move grid")
            const moviesUrl = `${BASE_URL}/movie/${movieId}?append_to_response=release_dates,credits`;
            const movieRes = await fetch(moviesUrl, options)

            const movieData = await movieRes.json();
            // console.log(movieData)

            const images = formatedImage(movieData)
            // console.log(images)

            if (backdropImage) {
                backdropImage.src = images.backdrop
                backdropImage.alt = `${movieData.title} Backdrop`;
                document.querySelector('.ambient-glow').style.setProperty('--glow-image', `url(${images.backdrop})`)

            }
            const mediaOk = await mediaAsset(movieId);
            if (mediaOk) {
                renderPopular();
                setActive(mostPopular);
            }
            renderDetails(movieData);
            spans(movieData)
            await mediaAsset(movieId);
            trailerName(movieData);


        }
    } catch (err) {
        console.error(`Something went wrong: ${err.message}`);
    }
}

const btnBackdrops = document.querySelector('.btn-backdrops');
const posters = document.querySelector('.btn-posters');
const videos = document.querySelector('.btn-videos');

const mostPopular = document.querySelector('.btn-popular');


if (btnBackdrops) {
    btnBackdrops.addEventListener('click', function () {
        renderBackdrops(mediaState.backdrops)
        setActive(btnBackdrops);
    })
}

if (posters) {
    posters.addEventListener('click', function () {
        media.innerHTML = '';

        renderBackdrops(mediaState.posters);
        setActive(posters);

    })
}

if (videos) {
    videos.addEventListener('click', function () {
        media.innerHTML = '';
        renderVideos(mediaState.videos);
        setActive(videos);



    })
}

if (mostPopular) {

    mostPopular.addEventListener('click', function () {
        media.innerHTML = '';

        renderPopular();
        setActive(mostPopular);

    })
}


//Modal DOM
const trailerButton = document.querySelectorAll('.btn-trailer');
const modal = document.querySelector('.modal');
const modalContent = document.querySelector('.modal-content');
const overlay = document.querySelector('.overlay');
// const trailerFrame = document.querySelector('.trailer-frame');
const btnCloseModal = document.querySelector('.close-modal');


const openTrailer = function (vidkey) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${vidkey.key}?autoplay=1`;
    iframe.classList.add('trailer-frame');
    iframe.allowFullscreen = true;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    modalContent.querySelector('.trailer-frame')?.remove();
    modalContent.append(iframe);
    modal.classList.remove('hidden')

}

const trailerName = function (Itemname) {
    if (trailerButton) {
        trailerButton.forEach(el => {
            el.addEventListener('click', function () {


                const mainTrailer = mediaState.videos.find(trail => trail.site === "YouTube" && trail.name === "Official Trailer" && trail.official === true) || mediaState.videos.find(trail => trail.site === "YouTube" && trail.official === true && trail.type === "Trailer") || mediaState.videos.find(trail => trail.site === "YouTube" && trail.type === "Trailer") || mediaState.videos.find(trail => trail.site === "YouTube" && trail.type === "Teaser");
                // console.log(mainTrailer)

                if (mainTrailer) {
                    openTrailer(mainTrailer)
                    trailerName();

                } else {
                    alert("No trailer found")
                }




                if (isTv) {
                    setAllText('.trailer-name', `${Itemname.name} - ${mainTrailer.type || 'Trailer'}`)

                } else {
                    setAllText('.trailer-name', `${Itemname.title} - ${mainTrailer.type || 'Trailer'}`)
                }
            });
        })

    }

}



const closeModal = function () {
    modal.classList.add('hidden');
    modalContent.querySelector('.trailer-frame')?.remove();
}

if (btnCloseModal && overlay) {

    btnCloseModal.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
}

if (modalContent) {

    modalContent.addEventListener('click', function (e) {
        e.stopPropagation();
    })
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
    }
})

window.addEventListener('pagehide', function () {
    if (!modal.classList.contains('hidden')) {
        closeModal();
    }
})
detailsImage();

let slides = [];
let heroItems = [];
let current = 0;
const interval = 5000;
const heroCarousel = document.querySelector('.hero-carousel');
const heroTitle = document.querySelector('#hero-title');
const heroOverview = document.querySelector('#hero-overview');
const heroMetaData = document.querySelector('#hero-meta');




const truncateText = function (text, maxLength = 104) {
    if (!text) return;
    const subString = text.slice(0, maxLength)
    return text.length > maxLength ? text.slice(0, subString.lastIndexOf(' ')).trim() + '...' : text;
};

// function truncateOverview(text, maxLength = 110) {
//   if (!text || text.length <= maxLength) return text;

//   const subString = text.substring(0, maxLength);
//   return subString.substring(0, subString.lastIndexOf(' ')) + '...';
// }


const renderHero = async function (item) {
    if (!heroTitle) return
    const { media_type, data } = item;
    const isTv = media_type === 'tv';
    const logoObj = data.images?.logos?.find(logo => logo.iso_639_1 === "en") || data.images?.logos?.[0];
    const logoPath = logoObj ? logoObj.file_path : null;

    const rawTitle = isTv ? data.name : data.title;
    if (logoPath) {
        heroTitle.innerHTML = `<img src="${imageUrl(logoPath)}" alt="${rawTitle}"class="hero-title-logo"/>`
    } else {
        heroTitle.textContent = rawTitle;
    }

    heroOverview.textContent = truncateText(data.overview);

    const dateStr = isTv ? data.first_air_date : data.release_date;
    const year = dateStr ? dateStr.split('-')[0] : 'N/A';
    const genreNames = data.genres?.slice(0, 2).map(g => g.name);

    let certificate;
    if (isTv) {
        const ratings = data.content_ratings?.results || [];
        const cert = ratings.find(c => c.iso_3166_1 === (data.origin_country?.[0] || 'US')) || ratings[0];
        certificate = cert?.rating;
    } else {
        const relDates = data.release_dates?.results?.find(
            r => r.iso_3166_1 === (data.origin_country?.[0] || 'US')
        );
        certificate = relDates?.release_dates?.find(c => c.certification !== '')?.certification;
    }

    const parts = [
        ...genreNames,
        year,
        certificate ? `<span class="cert-badge">${certificate}</span>` : null,
        `<span class="rating-inline"><i data-lucide="star" class="star-icon"></i> ${data.vote_average.toFixed(1)}<span>`
    ].filter(Boolean);

    heroMetaData.innerHTML = parts
        .map(p => `<span>${p}</span>`)
        .join('<span class="dot">•</span>');
    lucide.createIcons();
    if (heroDetails) {
        const detailsPage = isTv ? 'tv-details.html' : 'movie-details.html';
        heroDetails.href = `${detailsPage}?id=${data.id}`
    }
};

const heroInfo = document.querySelector('.home-hero-info');

const showNextSlide = function () {
    if (slides.length < 2) return;
    heroInfo.classList.add('fade-out');
    setTimeout(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
        renderHero(heroItems[current]);
        heroInfo.classList.remove('fade-out');

    }, 100);


};


const fetchHomepageBackdrops = async function () {

    if (!heroCarousel) return;

    try {
        const backdropUrl = `${BASE_URL}/trending/all/week`;

        const backdropRes = await fetch(backdropUrl, options);
        if (!backdropRes.ok) throw new Error(`HTTP response went wrong: ${backdropRes.status}`);
        const backdropData = await backdropRes.json();
        const backdropDataSliced = backdropData.results
            .filter(back => back.media_type === 'movie' || back.media_type === 'tv') //so we don't get celebrities
            .filter(back => back.backdrop_path)
            .filter(back => back.vote_count >= 50)
            .slice(0, 5)
        // console.log("Slice", backdropDataSliced)
        const detailsPromise = backdropDataSliced.map(m => {
            const url = m.media_type === 'tv'
                ? `${BASE_URL}/tv/${m.id}?append_to_response=content_ratings,images,videos&include_image_language=en,null`
                : `${BASE_URL}/movie/${m.id}?append_to_response=release_dates,images,videos&include_image_language=en,null`

            return fetch(url, options)
                .then(res => res.json())
                .then(data => ({ media_type: m.media_type, data }));
        }

        );

        heroItems = await Promise.all(detailsPromise);
        // console.log("heroItems", heroItems);

        heroCarousel.innerHTML = '';

        heroItems.forEach((back, index) => {
            const slide = document.createElement('div');
            slide.classList.add('hero-slide');
            if (index === 0) slide.classList.add('active');
            slide.style.backgroundImage = `url(${imageUrl(back.data.backdrop_path)})`
            heroCarousel.append(slide);

        });

        slides = document.querySelectorAll('.hero-slide');
        renderHero(heroItems[0]);

        startAutoplay();
    } catch (err) {
        console.error(`Error fetching homepage backdrop: ${err.message}`)
    }
}

const heroTrailerBtn = document.querySelector('#hero-trailer-btn');
const heroDetails = document.querySelector('#hero-details-link');

if (heroTrailerBtn) {
    heroTrailerBtn.addEventListener('click', () => {
        if (!heroItems || heroItems.length === 0) {
            console.log("Hero data is still loading...");
            return;
        }
        const currentItem = heroItems[current];
        if (!currentItem) return;

        const videoList = currentItem.data.videos?.results || [];

        const mainTrailer = videoList?.find(trail => trail.site === "YouTube" && trail.name.toLowerCase().includes("official trailer") && trail.official === true)
            || videoList.find(trail => trail.site === "YouTube" && trail.official === true && trail.type === "Trailer")
            || videoList.find(trail => trail.site === "YouTube" && trail.type === "Trailer")
            || videoList.find(trail => trail.site === "YouTube" && trail.type === "Teaser");

        // console.log(mainTrailer)
        if (mainTrailer) {
            openTrailer(mainTrailer);
            trailerName();
        } else {
            alert("No trailer found");
        }
        // console.log(currentItem)

        if (currentItem.media_type === 'tv') {
            document.querySelector('.trailer-name').textContent = `${currentItem.data.name} - ${mainTrailer.type || 'Trailer'}`


        } else {
            document.querySelector('.trailer-name').textContent = `${currentItem.data.title} - ${mainTrailer.type || 'Trailer'}`
        }
    });


};

let autoplayTimer = null;

const startAutoplay = function () {
    if (autoplayTimer) clearInterval(autoplayTimer);
    if (slides.length > 1) {
        autoplayTimer = setInterval(showNextSlides, interval);
    }
};

const goToSlide = function (direction) {
    if (slides.length < 2) return;

    heroInfo.classList.add('fade-out');
    setTimeout(() => {
        const outgoingSlide = slides[current];
        outgoingSlide.style.transform = getComputedStyle(outgoingSlide).transform;
        outgoingSlide.classList.remove('active')

        current = direction === 'next'
            ? (current + 1) % slides.length
            : (current - 1 + slides.length) % slides.length;
        slides[current].classList.add('active');
        renderHero(heroItems[current]);
        void heroInfo.offsetWidth;
        heroInfo.classList.remove('fade-out');
    }, 100);

    startAutoplay(); // reset the countdown after any manual navigation
};

const showNextSlides = function () { goToSlide('next'); };
const showPrevSlide = function () { goToSlide('prev'); };

// Arrow buttons
document.querySelector('#hero-next')?.addEventListener('click', showNextSlides);
document.querySelector('#hero-prev')?.addEventListener('click', showPrevSlide);

// Touch swipe
let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 50; // minimum px drag to count as a swipe

if (heroCarousel) {
    heroCarousel.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    heroCarousel.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX;

        if (Math.abs(deltaX) < swipeThreshold) return; // too small, ignore as a tap

        if (deltaX < 0) {
            showNextSlides(); // swiped left → go forward
        } else {
            showPrevSlide(); // swiped right → go back
        }
    });
}

const PopularNowHome = [];
const mainHomePage = document.querySelector('.main-homepage')
const popularTab = document.querySelectorAll('.popular-tab');
const popularNow = document.querySelector('.popular-now');

const renderPopularHome = async function (mediaType = 'movie') {
    if (!mainHomePage) return;

    try {
        const url = `${BASE_URL}/discover/${mediaType}?sort_by=popularity_desc`;
        const urlRes = await fetch(url, options);
        const urlData = await urlRes.json();
        if (!urlRes.ok) throw new Error(`HTTP response went wrong: ${urlRes.status}`)
        const dataSliced = urlData.results.slice(0, 14);

        popularNow.innerHTML = '';

        dataSliced.forEach(el => {
            const detailsPage = mediaType === 'movie' ? 'movie-details.html' : 'tv-details.html';
            const image = document.createElement('img');
            image.classList.add('popular-poster');
            image.alt = mediaType === 'movie' ? el.title : el.name;
            image.src = imageUrl(el.poster_path, 'w500')
            const link = document.createElement('a');
            link.href = `${detailsPage}?id=${el.id}`
            link.classList.add('poster-link');
            link.append(image);
            image.draggable = false;
            link.draggable = false;
            popularNow.append(link);

        });
    } catch (err) {
        console.error(`Error rendering popular now: ${err.message}`)
    }
}
const seeAllLinks = document.querySelector('.link .see-all');

popularTab.forEach(tab => {
    tab.addEventListener('click', function () {
        popularTab.forEach(click => click.classList.remove('active'));
        tab.classList.add('active');
        renderPopularHome(tab.dataset.type);
        if (seeAllLinks) {
            seeAllLinks.href = tab.dataset.type === 'tv'
                ? 'tvshow.html?sort=popularity.desc'
                : 'browse.html?sort=popularity.desc';
        }

    });
});

//Highly Rated 
const highlyRated = document.querySelector('.highly-rated-main');

const renderHighlyRated = async function () {
    if (!highlyRated) return

    try {
        const movieUrl = `${BASE_URL}/discover/movie?sort_by=vote_average.desc&vote_count.gte=5000&include_adult=false`
        const tvUrl = `${BASE_URL}/discover/tv?sort_by=vote_average.desc&vote_count.gte=1500&include_adult=false`;

        const [movieRes, tvRes] = await Promise.all([
            fetch(movieUrl, options),
            fetch(tvUrl, options)
        ]);
        if (!movieRes.ok) throw new Error(`HTTP response went wrong: ${movieRes.status}`);
        if (!tvRes.ok) throw new Error(`HTTP response went wrong: ${tvRes.status}`)

        const movieData = await movieRes.json();
        const tvData = await tvRes.json();

        // console.log("Hi", movieData, tvData);

        const movieSliced = movieData.results.slice(0, 7);
        const tvSliced = tvData.results.slice(0, 7);

        const tvAndMovie = [...movieSliced, ...tvSliced];
        tvAndMovie.sort((a, b) => b.vote_average - a.vote_average);
        // console.log("TV and movie", tvAndMovie);

        tvAndMovie.forEach(item => {
            const image = document.createElement('img');
            image.alt = item.first_air_date ? item.name : item.title;
            image.classList.add('highly-rated-poster');
            image.src = imageUrl(item.poster_path, 'w500')
            const link = document.createElement('a');
            link.href = item.first_air_date ? `tv-details.html?id=${item.id}` : `movie-details.html?id=${item.id}`;
            link.classList.add('highly-rated-link');
            link.append(image);
            image.draggable = false;
            link.draggable = false;
            highlyRated.append(link);


        })


    } catch (err) {
        console.error(`Something went wrong: ${err.message}`)
    }
}

const hiddenGemsMain = document.querySelector('.hidden-gem-main')
//Hidden Gems
const renderGems = async function () {
    if (!hiddenGemsMain) return;
    try {
        const hiddenGemData = document.querySelector('.hidden-gem-main');
        const request = hiddenGems.map(async item => {
            const res = await fetch(`${BASE_URL}/${item.type}/${item.id}`, options);
            if (!res.ok) throw new Error(`Failed to fetch ${item.type} (ID: ${item.id}) - Status: ${res.status}`);
            return await res.json();
        });

        const gems = await Promise.all(request);


        gems.forEach(item => {
            const detailsPage = item.first_air_date ? 'tv-details.html' : 'movie-details.html'
            const image = document.createElement('img');
            image.alt = item.first_air_date ? item.name : item.title;
            image.classList.add('hidden-gem-poster');
            image.src = imageUrl(item.poster_path, 'w500')
            const link = document.createElement('a');
            link.href = item.first_air_date ? `tv-details.html?id=${item.id}` : `movie-details.html?id=${item.id}`;
            link.classList.add('hidden-gem-link');
            link.append(image);
            image.draggable = false;
            link.draggable = false;
            hiddenGemData.append(link);
        });


    } catch (err) {
        console.error(`Something rendering gems: ${err.message}`)
    }
}

const getDaysAgo = function (daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
}

const renderNew = async function () {
    const newMain = document.querySelector('.new-main');
    if (!newMain) return;


    try {


        const today = getDaysAgo(0);
        const sixWeeksAgo = getDaysAgo(45);


        const movieUrl = `${BASE_URL}/discover/movie?sort_by=primary_release_date.desc&primary_release_date.gte=${sixWeeksAgo}&primary_release_date.lte=${today}&vote_count.gte=20&include_adult=false`;

        const tvUrl = `${BASE_URL}/discover/tv?sort_by=first_air_date.desc&first_air_date.gte=${sixWeeksAgo}&first_air_date.lte=${today}&vote_count.gte=7&include_adult=false`;

        const [movieRes, tvRes] = await Promise.all([
            fetch(movieUrl, options),
            fetch(tvUrl, options)
        ]);

        if (!movieRes.ok) throw new Error(`HTTP response went wrong: ${movieRes.status}`);
        if (!tvRes.ok) throw new Error(`HTTP response went wrong: ${tvRes.status}`);


        const movieData = await movieRes.json();
        const tvData = await tvRes.json();

        const newMovieSliced = movieData.results.slice(0, 7);
        const newTvSliced = tvData.results.slice(0, 7);

        const newMovieAndTv = [...newMovieSliced, ...newTvSliced]
        newMovieAndTv.sort((a, b) => b.vote_average - a.vote_average)

        newMovieAndTv.forEach(item => {
            const image = document.createElement('img');
            image.alt = item.first_air_date ? item.name : item.title;
            image.classList.add('new-poster');
            image.src = imageUrl(item.poster_path, 'w500');

            const link = document.createElement('a');
            link.href = item.first_air_date ? `tv-details.html?id=${item.id}` : `movie-details.html?id=${item.id}`;
            link.classList.add('new-link');
            link.append(image);
            image.draggable = false;
            link.draggable = false;
            newMain.append(link);
        });
    } catch (err) {
        console.error(`Error rendering new releases: ${err.message}`);
    }
}

const getDaysInFuture = function (daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
}


const renderComingSoon = async function () {
    const upComingMain = document.querySelector('.upcoming-main');
    if (!upComingMain) return;
    try {


        const today = getDaysAgo(0);
        const threeMonths = getDaysInFuture(50);

        const movieUrl = `${BASE_URL}/discover/movie?sort_by=popularity.desc&primary_release_date.gte=${today}&with_original_language=en&include_adult=false`;


        const tvUrl = `${BASE_URL}/discover/tv?sort_by=popularity.desc&first_air_date.gte=${today}&with_original_language=en&include_adult=false`;

        const [movieRes, tvRes] = await Promise.all([
            fetch(movieUrl, options),
            fetch(tvUrl, options)
        ]);

        if (!movieRes.ok) throw new Error(`HTTP response went wrong: ${movieRes.status}`);
        if (!tvRes.ok) throw new Error(`HTTP response went wrong: ${tvRes.status}`);

        const movieData = await movieRes.json();
        const tvData = await tvRes.json();

        const movieSliced = movieData.results.slice(0, 7);
        const tvSliced = tvData.results.slice(0, 7);
        const movieAndTv = [...movieSliced, ...tvSliced];

        movieAndTv.sort((a, b) => b.popularity - a.popularity);

        movieAndTv.forEach(item => {
            if (!item.poster_path) return;
            const image = document.createElement('img')
            image.alt = item.first_air_date ? item.name : item.title;
            image.classList.add('upcoming-poster');
            image.src = imageUrl(item.poster_path, 'w500');
            image.draggable = false;
            const link = document.createElement('a');
            link.href = item.first_air_date ? `tv-details.html?id=${item.id}` : `movie-details.html?id=${item.id}`;
            link.classList.add('upcoming-link');
            link.append(image);
            link.draggable = false;
            upComingMain.append(link);

        })
    } catch (err) {
        console.error(`Error rendering coming soon: ${err.message}`)
    }
}

const homeReady = Promise.all([
    fetchHomepageBackdrops(),
    renderPopularHome('movie'),
    renderHighlyRated(),
    renderGems(),
    renderNew(),
    renderComingSoon()


]);

if (window.location.hash) {
    homeReady.then(() => {
        const target = document.querySelector(window.location.hash);
        if (target) {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    });
}
